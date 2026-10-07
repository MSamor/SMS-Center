import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { digest, secret, hashPassword, verifyPassword } from './crypto.js';
import { getSettings, cleanup, issueToken, tokenRecord } from './db.js';
import { extractCode, signatureOf } from './extract.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');
const name = z.string().trim().min(1).max(64);
const id = z.string().uuid();
const paging = {
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
};
const optionalDate = z.coerce.number().int().nonnegative().optional();
const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const parse = (schema, value) => {
  const result = schema.safeParse(value);
  if (!result.success)
    throw fail(
      400,
      'INVALID_INPUT',
      result.error.issues.map((v) => `${v.path.join('.') || '参数'}: ${v.message}`).join('; '),
    );
  return result.data;
};
const ok = (res, data, status = 200) => res.status(status).json({ data });
function decodeCookies(header = '') {
  const result = {};
  for (const item of header.split(';')) {
    const split = item.indexOf('=');
    if (split < 0) continue;
    try {
      result[item.slice(0, split).trim()] = decodeURIComponent(item.slice(split + 1));
    } catch {
      /* Ignore malformed cookies. */
    }
  }
  return result;
}
export function createApp({ db, config }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.trustProxy || false);
  app.use(helmet({ contentSecurityPolicy: config.production ? undefined : false }));
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    res.setHeader('X-Request-Id', req.requestId);
    if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
    next();
  });
  const audit = (action) => (req, res, next) => {
    const start = performance.now();
    res.on('finish', () => {
      try {
        db.prepare(
          `INSERT INTO audits (token_id,token_name,action,signature,device_id,status,ip,duration_ms,message_id,created_at)
          VALUES (?,?,?,?,?,?,?,?,?,?)`,
        ).run(
          req.apiToken?.id || null,
          req.apiToken?.name || req.session?.username || null,
          action,
          typeof req.auditSignature === 'string'
            ? req.auditSignature
            : typeof req.query.signature === 'string'
              ? req.query.signature.slice(0, 64)
              : null,
          req.auditDevice || null,
          res.statusCode,
          req.ip || '',
          Math.round(performance.now() - start),
          req.auditMessage || null,
          Date.now(),
        );
      } catch (error) {
        console.error('Audit write failed:', error.message);
      }
    });
    next();
  };
  app.use('/api/v1/codes/latest', audit('query'));
  app.use('/api/v1/sms', audit('upload'));
  app.use('/api/admin/login', audit('admin.login'));
  if (!config.testing)
    app.use(
      '/api',
      rateLimit({
        windowMs: 60000,
        limit: 300,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (req, res) =>
          res.status(429).json({
            error: { code: 'RATE_LIMITED', message: '请求过于频繁，请稍后重试' },
            requestId: req.requestId,
          }),
      }),
    );
  app.use(express.json({ limit: '24kb' }));
  const apiAuth = (kind) => (req, res, next) => {
    const bearer = req.headers.authorization;
    if (!bearer || !/^Bearer [A-Za-z0-9_-]{20,100}$/.test(bearer))
      throw fail(401, 'UNAUTHORIZED', '请提供有效的 Bearer Token');
    const row = db.prepare('SELECT * FROM tokens WHERE hash=?').get(digest(bearer.slice(7)));
    if (!row || row.revoked_at || (row.expires_at && row.expires_at <= Date.now()))
      throw fail(401, 'UNAUTHORIZED', 'Token 无效、已撤销或已过期');
    req.apiToken = row;
    if (row.kind !== kind) throw fail(403, 'TOKEN_SCOPE', 'Token 类型不允许访问该接口');
    if (kind === 'upload') {
      const device = db.prepare('SELECT * FROM devices WHERE id=?').get(row.device_id);
      if (!device?.enabled) throw fail(403, 'DEVICE_DISABLED', '设备已停用');
      req.device = device;
      req.auditDevice = device.id;
    }
    db.prepare('UPDATE tokens SET last_used_at=? WHERE id=?').run(Date.now(), row.id);
    next();
  };
  const adminAuth = (req, res, next) => {
    const cookie = decodeCookies(req.headers.cookie).sms_session;
    const session =
      cookie &&
      db
        .prepare(
          `SELECT s.*,a.role,a.must_change_password FROM sessions s
          JOIN admins a ON a.username=s.username WHERE s.hash=? AND s.expires_at>?`,
        )
        .get(digest(cookie), Date.now());
    if (!session) throw fail(401, 'ADMIN_UNAUTHORIZED', '请先登录管理中心');
    req.session = session;
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(req.method) &&
      req.headers['x-csrf-token'] !== session.csrf
    )
      throw fail(403, 'CSRF_FAILED', '请求校验失败，请刷新页面');
    if (session.must_change_password && !['/me', '/password', '/logout'].includes(req.path))
      throw fail(403, 'PASSWORD_CHANGE_REQUIRED', '首次登录必须修改初始密码后才能使用管理功能');
    next();
  };
  const checkOrigin = (req, res, next) => {
    const origin = req.headers.origin;
    if (
      (origin && !config.origins.includes(origin)) ||
      req.headers['sec-fetch-site'] === 'cross-site'
    )
      throw fail(403, 'ORIGIN_DENIED', '不允许的管理页面来源');
    next();
  };
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'strict',
    secure: config.production,
    path: '/api/admin',
  };
  app.get('/api/health', (req, res) => {
    db.prepare('SELECT 1').get();
    ok(res, { status: 'ok', version: '1.0.0' });
  });
  app.get('/api/v1/device', apiAuth('upload'), (req, res) =>
    ok(res, { id: req.device.id, name: req.device.name, serverTime: Date.now() }),
  );
  app.post('/api/v1/sms', apiAuth('upload'), (req, res) => {
    const input = parse(
      z
        .object({
          clientMessageId: z.string().regex(/^[A-Za-z0-9._:-]{1,128}$/),
          sender: name,
          body: z.string().trim().min(1).max(4096),
          receivedAt: z.number().int().nonnegative(),
        })
        .strict(),
      req.body,
    );
    const duplicate = db
      .prepare('SELECT id,signature FROM messages WHERE device_id=? AND client_id=?')
      .get(req.device.id, input.clientMessageId);
    if (duplicate) {
      req.auditMessage = duplicate.id;
      req.auditSignature = duplicate.signature;
      return ok(res, { id: duplicate.id, duplicate: true });
    }
    const now = Date.now();
    if (
      input.receivedAt > now + 300000 ||
      input.receivedAt < now - getSettings(db).retentionDays * 86400000
    )
      throw fail(422, 'INVALID_MESSAGE_TIME', '短信时间超出允许范围，请检查设备时间');
    const signature = signatureOf(input.body, input.sender);
    req.auditSignature = signature;
    const rule = db.prepare('SELECT * FROM rules WHERE signature=?').get(signature);
    const code = extractCode(input.body, rule || {});
    if (!code) throw fail(422, 'NO_CODE', '未识别到验证码，可在管理中心配置签名识别规则');
    const messageId = randomUUID();
    db.transaction(() => {
      db.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?,?)').run(
        messageId,
        req.device.id,
        input.clientMessageId,
        signature,
        config.box.encrypt({ sender: input.sender, body: input.body, code }, messageId),
        input.receivedAt,
        now,
      );
      db.prepare('UPDATE devices SET last_seen_at=? WHERE id=?').run(now, req.device.id);
    })();
    req.auditMessage = messageId;
    ok(res, { id: messageId, signature, duplicate: false }, 201);
  });
  app.get('/api/v1/codes/latest', apiAuth('query'), (req, res) => {
    const input = parse(
      z
        .object({
          signature: name,
          deviceId: id.optional(),
          maxAgeSeconds: z.coerce.number().int().min(1).max(86400).optional(),
        })
        .strict(),
      req.query,
    );
    req.auditSignature = input.signature;
    req.auditDevice = input.deviceId || null;
    const signatures = JSON.parse(req.apiToken.signatures),
      devices = JSON.parse(req.apiToken.device_ids);
    if (!signatures.includes('*') && !signatures.includes(input.signature))
      throw fail(403, 'SIGNATURE_DENIED', 'Token 没有该短信签名的查询权限');
    if (input.deviceId && devices.length && !devices.includes(input.deviceId))
      throw fail(403, 'DEVICE_DENIED', 'Token 没有该设备的查询权限');
    const maxAge = Math.min(input.maxAgeSeconds || 86400, getSettings(db).codeMaxAgeSeconds);
    const clauses = ['m.signature=?', 'm.received_at>=?', 'm.received_at<=?', 'd.enabled=1'];
    const args = [input.signature, Date.now() - maxAge * 1000, Date.now()];
    if (input.deviceId) {
      clauses.push('m.device_id=?');
      args.push(input.deviceId);
    }
    if (devices.length) {
      clauses.push(`m.device_id IN (${devices.map(() => '?').join(',')})`);
      args.push(...devices);
    }
    const row = db
      .prepare(
        `SELECT m.* FROM messages m JOIN devices d ON d.id=m.device_id WHERE ${clauses.join(' AND ')} ORDER BY m.received_at DESC,m.uploaded_at DESC,m.id DESC LIMIT 1`,
      )
      .get(...args);
    if (!row) throw fail(404, 'CODE_NOT_FOUND', '没有找到有效期内的验证码');
    const payload = config.box.decrypt(row.ciphertext, row.id);
    req.auditMessage = row.id;
    req.auditDevice = row.device_id;
    ok(res, {
      id: row.id,
      signature: row.signature,
      code: payload.code,
      sender: payload.sender,
      deviceId: row.device_id,
      receivedAt: row.received_at,
      expiresAt: row.received_at + maxAge * 1000,
    });
  });
  app.use('/api/admin', checkOrigin);
  const loginLimiter = config.testing
    ? (req, res, next) => next()
    : rateLimit({
        windowMs: 900000,
        limit: 10,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        handler: (req, res) =>
          res.status(429).json({
            error: { code: 'LOGIN_LIMITED', message: '登录失败次数过多，请 15 分钟后重试' },
          }),
      });
  app.post('/api/admin/login', loginLimiter, async (req, res) => {
    const input = parse(
      z.object({ username: name, password: z.string().min(1).max(256) }).strict(),
      req.body,
    );
    const admin = db.prepare('SELECT * FROM admins WHERE username=?').get(input.username);
    // Always perform a password derivation to avoid a cheap username-existence oracle.
    const fallback = '00000000000000000000000000000000:' + '00'.repeat(64);
    const valid = await verifyPassword(input.password, admin?.password_hash || fallback);
    if (!admin || !valid) throw fail(401, 'LOGIN_FAILED', '用户名或密码错误');
    const token = secret('ses'),
      csrf = secret('csrf');
    const previous = decodeCookies(req.headers.cookie).sms_session;
    if (previous) db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(previous));
    db.prepare('INSERT INTO sessions VALUES (?,?,?,?)').run(
      digest(token),
      admin.username,
      csrf,
      Date.now() + config.sessionHours * 3600000,
    );
    res.cookie('sms_session', token, { ...cookieOptions, maxAge: config.sessionHours * 3600000 });
    ok(res, {
      username: admin.username,
      role: admin.role,
      mustChangePassword: !!admin.must_change_password,
      csrfToken: csrf,
    });
  });
  app.use('/api/admin', adminAuth);
  app.get('/api/admin/me', (req, res) =>
    ok(res, {
      username: req.session.username,
      role: req.session.role,
      mustChangePassword: !!req.session.must_change_password,
      csrfToken: req.session.csrf,
    }),
  );
  app.post('/api/admin/logout', (req, res) => {
    db.prepare('DELETE FROM sessions WHERE hash=?').run(req.session.hash);
    res.clearCookie('sms_session', cookieOptions);
    ok(res, { loggedOut: true });
  });
  app.post('/api/admin/password', audit('admin.password'), async (req, res) => {
    const input = parse(
      z
        .object({
          currentPassword: z.string().min(1).max(256),
          newPassword: z.string().min(12).max(256),
        })
        .strict(),
      req.body,
    );
    const admin = db.prepare('SELECT * FROM admins WHERE username=?').get(req.session.username);
    if (!(await verifyPassword(input.currentPassword, admin.password_hash)))
      throw fail(400, 'WRONG_PASSWORD', '当前密码错误');
    if (input.newPassword === input.currentPassword)
      throw fail(400, 'PASSWORD_UNCHANGED', '新密码不能与当前密码相同');
    const hashed = await hashPassword(input.newPassword);
    db.transaction(() => {
      const changed = db
        .prepare(
          'UPDATE admins SET password_hash=?,must_change_password=0 WHERE username=? AND password_hash=?',
        )
        .run(hashed, req.session.username, admin.password_hash);
      if (!changed.changes) throw fail(409, 'PASSWORD_CHANGED', '密码已被其他会话修改，请重新登录');
      db.prepare('DELETE FROM sessions WHERE username=?').run(req.session.username);
    })();
    res.clearCookie('sms_session', cookieOptions);
    ok(res, { updated: true });
  });
  app.get('/api/admin/overview', (req, res) => {
    const now = Date.now(),
      day = now - 86400000;
    const total = db.prepare('SELECT COUNT(*) n FROM messages').get().n;
    const last24h = db.prepare('SELECT COUNT(*) n FROM messages WHERE uploaded_at>=?').get(day).n;
    const deviceCount = db.prepare('SELECT COUNT(*) n FROM devices WHERE enabled=1').get().n;
    const queryCount = db
      .prepare("SELECT COUNT(*) n FROM audits WHERE action='query' AND created_at>=?")
      .get(day).n;
    const failedQueries = db
      .prepare(
        "SELECT COUNT(*) n FROM audits WHERE action='query' AND status>=400 AND created_at>=?",
      )
      .get(day).n;
    const series = db
      .prepare(
        "SELECT date(uploaded_at/1000,'unixepoch') day,COUNT(*) count FROM messages WHERE uploaded_at>=? GROUP BY day ORDER BY day",
      )
      .all(now - 7 * 86400000);
    const topSignatures = db
      .prepare(
        'SELECT signature,COUNT(*) count FROM messages GROUP BY signature ORDER BY count DESC LIMIT 6',
      )
      .all();
    const recentMessages = db
      .prepare(
        `SELECT m.id,m.signature,m.received_at receivedAt,d.name deviceName FROM messages m JOIN devices d ON d.id=m.device_id ORDER BY m.uploaded_at DESC LIMIT 6`,
      )
      .all();
    ok(res, {
      total,
      last24h,
      deviceCount,
      queryCount,
      failedQueries,
      series,
      topSignatures,
      recentMessages,
    });
  });
  app.get('/api/admin/signatures', (req, res) =>
    ok(
      res,
      db
        .prepare(
          'SELECT signature,COUNT(*) count FROM messages GROUP BY signature ORDER BY signature',
        )
        .all(),
    ),
  );
  app.get('/api/admin/messages', (req, res) => {
    const input = parse(
      z
        .object({
          ...paging,
          signature: name.optional(),
          deviceId: id.optional(),
          from: optionalDate,
          to: optionalDate,
        })
        .strict(),
      req.query,
    );
    const clauses = ['1=1'],
      args = [];
    for (const [key, column, operator] of [
      ['signature', 'm.signature', '='],
      ['deviceId', 'm.device_id', '='],
      ['from', 'm.received_at', '>='],
      ['to', 'm.received_at', '<='],
    ]) {
      if (input[key] !== undefined) {
        clauses.push(`${column}${operator}?`);
        args.push(input[key]);
      }
    }
    if (input.from && input.to && input.from > input.to)
      throw fail(400, 'INVALID_RANGE', '开始时间不能晚于结束时间');
    const where = clauses.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) n FROM messages m WHERE ${where}`).get(...args).n;
    const rows = db
      .prepare(
        `SELECT m.*,d.name device_name FROM messages m JOIN devices d ON d.id=m.device_id WHERE ${where} ORDER BY m.received_at DESC,m.uploaded_at DESC LIMIT ? OFFSET ?`,
      )
      .all(...args, input.pageSize, (input.page - 1) * input.pageSize);
    const items = rows.map((row) => {
      const payload = config.box.decrypt(row.ciphertext, row.id);
      return {
        id: row.id,
        signature: row.signature,
        deviceId: row.device_id,
        deviceName: row.device_name,
        sender: payload.sender,
        code: '•'.repeat(payload.code.length),
        receivedAt: row.received_at,
        uploadedAt: row.uploaded_at,
      };
    });
    ok(res, { items, total, page: input.page, pageSize: input.pageSize });
  });
  app.get('/api/admin/messages/:id', audit('admin.reveal'), (req, res) => {
    const messageId = parse(id, req.params.id);
    const row = db.prepare('SELECT * FROM messages WHERE id=?').get(messageId);
    if (!row) throw fail(404, 'NOT_FOUND', '短信不存在');
    req.auditMessage = row.id;
    req.auditSignature = row.signature;
    req.auditDevice = row.device_id;
    ok(res, {
      id: row.id,
      signature: row.signature,
      deviceId: row.device_id,
      receivedAt: row.received_at,
      uploadedAt: row.uploaded_at,
      ...config.box.decrypt(row.ciphertext, row.id),
    });
  });
  app.delete('/api/admin/messages/:id', audit('admin.deleteMessage'), (req, res) => {
    const messageId = parse(id, req.params.id);
    if (!db.prepare('DELETE FROM messages WHERE id=?').run(messageId).changes)
      throw fail(404, 'NOT_FOUND', '短信不存在');
    req.auditMessage = messageId;
    ok(res, { deleted: true });
  });
  app.get('/api/admin/devices', (req, res) =>
    ok(
      res,
      db
        .prepare(
          `SELECT d.*, (SELECT COUNT(*) FROM messages m WHERE m.device_id=d.id) message_count FROM devices d ORDER BY created_at DESC`,
        )
        .all()
        .map((v) => ({
          id: v.id,
          name: v.name,
          enabled: !!v.enabled,
          createdAt: v.created_at,
          lastSeenAt: v.last_seen_at,
          messageCount: v.message_count,
        })),
    ),
  );
  app.post('/api/admin/devices', audit('admin.createDevice'), (req, res) => {
    const input = parse(z.object({ name }).strict(), req.body);
    const deviceId = randomUUID();
    const token = db.transaction(() => {
      db.prepare('INSERT INTO devices (id,name,created_at) VALUES (?,?,?)').run(
        deviceId,
        input.name,
        Date.now(),
      );
      return issueToken(db, {
        id: randomUUID(),
        name: `${input.name} 上传`,
        kind: 'upload',
        deviceId,
      });
    })();
    ok(res, { id: deviceId, name: input.name, uploadToken: token.token }, 201);
  });
  app.patch('/api/admin/devices/:id', audit('admin.updateDevice'), (req, res) => {
    const deviceId = parse(id, req.params.id);
    const input = parse(z.object({ name, enabled: z.boolean() }).strict(), req.body);
    if (
      !db
        .prepare('UPDATE devices SET name=?,enabled=? WHERE id=?')
        .run(input.name, Number(input.enabled), deviceId).changes
    )
      throw fail(404, 'NOT_FOUND', '设备不存在');
    ok(res, { updated: true });
  });
  app.post('/api/admin/devices/:id/rotate-token', audit('admin.rotateUploadToken'), (req, res) => {
    const deviceId = parse(id, req.params.id);
    const device = db.prepare('SELECT * FROM devices WHERE id=?').get(deviceId);
    if (!device) throw fail(404, 'NOT_FOUND', '设备不存在');
    const token = db.transaction(() => {
      db.prepare(
        "UPDATE tokens SET revoked_at=? WHERE device_id=? AND kind='upload' AND revoked_at IS NULL",
      ).run(Date.now(), deviceId);
      return issueToken(db, {
        id: randomUUID(),
        name: `${device.name} 上传`,
        kind: 'upload',
        deviceId,
      });
    })();
    ok(res, { uploadToken: token.token });
  });
  app.get('/api/admin/tokens', (req, res) =>
    ok(res, db.prepare('SELECT * FROM tokens ORDER BY created_at DESC').all().map(tokenRecord)),
  );
  app.post('/api/admin/tokens', audit('admin.createQueryToken'), (req, res) => {
    const input = parse(
      z
        .object({
          name,
          signatures: z.array(name).min(1).max(100),
          deviceIds: z.array(id).max(100).default([]),
          expiresAt: z.number().int().positive().nullable().default(null),
        })
        .strict(),
      req.body,
    );
    if (input.signatures.includes('*') && input.signatures.length !== 1)
      throw fail(400, 'INVALID_SCOPE', '全部签名权限不能与指定签名混用');
    if (input.expiresAt && input.expiresAt <= Date.now())
      throw fail(400, 'INVALID_EXPIRY', 'Token 到期时间必须在未来');
    for (const deviceId of input.deviceIds)
      if (!db.prepare('SELECT id FROM devices WHERE id=?').get(deviceId))
        throw fail(400, 'INVALID_DEVICE', '设备不存在');
    ok(
      res,
      issueToken(db, {
        id: randomUUID(),
        kind: 'query',
        ...input,
        signatures: [...new Set(input.signatures)],
        deviceIds: [...new Set(input.deviceIds)],
      }),
      201,
    );
  });
  app.delete('/api/admin/tokens/:id', audit('admin.revokeToken'), (req, res) => {
    const tokenId = parse(id, req.params.id);
    if (
      !db
        .prepare('UPDATE tokens SET revoked_at=COALESCE(revoked_at,?) WHERE id=?')
        .run(Date.now(), tokenId).changes
    )
      throw fail(404, 'NOT_FOUND', 'Token 不存在');
    ok(res, { revoked: true });
  });
  app.get('/api/admin/audits', (req, res) => {
    const input = parse(
      z
        .object({
          ...paging,
          action: z.enum(['query', 'upload', 'admin.reveal', 'admin.login']).optional(),
          signature: name.optional(),
          tokenId: id.optional(),
          status: z.enum(['success', 'failure']).optional(),
          from: optionalDate,
          to: optionalDate,
        })
        .strict(),
      req.query,
    );
    const clauses = ['1=1'],
      args = [];
    for (const [key, column, operator] of [
      ['action', 'action', '='],
      ['signature', 'signature', '='],
      ['tokenId', 'token_id', '='],
      ['from', 'created_at', '>='],
      ['to', 'created_at', '<='],
    ]) {
      if (input[key] !== undefined) {
        clauses.push(`${column}${operator}?`);
        args.push(input[key]);
      }
    }
    if (input.status) clauses.push(input.status === 'success' ? 'status<400' : 'status>=400');
    const where = clauses.join(' AND ');
    const total = db.prepare(`SELECT COUNT(*) n FROM audits WHERE ${where}`).get(...args).n;
    const items = db
      .prepare(
        `SELECT id,token_id tokenId,token_name tokenName,action,signature,device_id deviceId,status,ip,duration_ms durationMs,message_id messageId,created_at createdAt FROM audits WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT ? OFFSET ?`,
      )
      .all(...args, input.pageSize, (input.page - 1) * input.pageSize);
    ok(res, { items, total, page: input.page, pageSize: input.pageSize });
  });
  app.get('/api/admin/rules', (req, res) =>
    ok(
      res,
      db
        .prepare(
          'SELECT signature,keyword,code_length codeLength,alphabet,updated_at updatedAt FROM rules ORDER BY signature',
        )
        .all(),
    ),
  );
  app.put('/api/admin/rules', audit('admin.saveRule'), (req, res) => {
    const input = parse(
      z
        .object({
          signature: name,
          keyword: z.string().trim().max(32),
          codeLength: z
            .number()
            .int()
            .refine((v) => v === 0 || (v >= 4 && v <= 10), '长度为 0 或 4～10'),
          alphabet: z.enum(['digits', 'alphanumeric']),
        })
        .strict(),
      req.body,
    );
    if (input.alphabet === 'digits' && input.codeLength > 8)
      throw fail(400, 'INVALID_RULE', '纯数字验证码长度最大为 8');
    db.prepare(
      'INSERT INTO rules VALUES (?,?,?,?,?) ON CONFLICT(signature) DO UPDATE SET keyword=excluded.keyword,code_length=excluded.code_length,alphabet=excluded.alphabet,updated_at=excluded.updated_at',
    ).run(input.signature, input.keyword, input.codeLength, input.alphabet, Date.now());
    ok(res, { saved: true });
  });
  app.delete('/api/admin/rules/:signature', audit('admin.deleteRule'), (req, res) => {
    db.prepare('DELETE FROM rules WHERE signature=?').run(parse(name, req.params.signature));
    ok(res, { deleted: true });
  });
  app.get('/api/admin/settings', (req, res) => ok(res, getSettings(db)));
  app.put('/api/admin/settings', audit('admin.settings'), (req, res) => {
    const input = parse(
      z
        .object({
          retentionDays: z.number().int().min(1).max(365),
          auditRetentionDays: z.number().int().min(1).max(365),
          codeMaxAgeSeconds: z.number().int().min(30).max(86400),
        })
        .strict(),
      req.body,
    );
    db.transaction(() => {
      for (const [key, value] of Object.entries(input))
        db.prepare('UPDATE settings SET value=? WHERE key=?').run(JSON.stringify(value), key);
    })();
    cleanup(db);
    ok(res, input);
  });
  app.use('/api', (req, res, next) => next(fail(404, 'NOT_FOUND', '接口不存在')));
  const publicDir = config.publicDir || root;
  if (fs.existsSync(path.join(publicDir, 'index.html'))) {
    app.use(express.static(publicDir, { index: false, maxAge: config.production ? '1h' : 0 }));
    app.get(/.*/, (req, res, next) => {
      if (path.extname(req.path) || !req.accepts('html')) return next();
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(path.join(publicDir, 'index.html'));
    });
  }
  app.get('/', (req, res) =>
    res
      .status(503)
      .type('text')
      .send('管理页面尚未构建，请在项目根目录执行 npm run build，然后重启 Node 服务。'),
  );
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    const status =
      error.type === 'entity.too.large'
        ? 413
        : error instanceof SyntaxError && error.status === 400
          ? 400
          : error.status || 500;
    const message =
      status >= 500
        ? '服务内部错误，请联系管理员'
        : status === 413
          ? '请求内容过大'
          : error instanceof SyntaxError
            ? 'JSON 格式错误'
            : error.message;
    if (status >= 500) console.error(`[${req.requestId}]`, error.message);
    res.status(status).json({
      error: { code: error.code || (status === 500 ? 'INTERNAL_ERROR' : 'BAD_REQUEST'), message },
      requestId: req.requestId,
    });
  });
  return app;
}

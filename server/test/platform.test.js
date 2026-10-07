import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';
import { cipherBox } from '../src/crypto.js';
import { openDatabase, cleanup } from '../src/db.js';
import { createApp } from '../src/app.js';
import { extractCode, signatureOf } from '../src/extract.js';
let db, app, directory, cookie, csrf, deviceA, deviceB, queryToken, queryId, messageId;
const initialPassword = 'initial-integration-password';
const adminPassword = 'integration-test-password';
const postAdmin = (route, method = 'post') =>
  request(app)[method](`/api/admin${route}`).set('Cookie', cookie).set('X-CSRF-Token', csrf);
const getAdmin = (route) => request(app).get(`/api/admin${route}`).set('Cookie', cookie);
const upload = (device, overrides = {}) =>
  request(app)
    .post('/api/v1/sms')
    .auth(device.uploadToken, { type: 'bearer' })
    .send({
      clientMessageId: randomUUID(),
      sender: '10690001',
      body: '【示例服务】您的验证码为 123456，5分钟内有效。',
      receivedAt: Date.now() - 1000,
      ...overrides,
    });
before(async () => {
  directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-center-test-'));
  const config = {
    dbPath: path.join(directory, 'test.sqlite'),
    box: cipherBox(randomBytes(32)),
    username: 'admin',
    password: initialPassword,
    production: false,
    testing: true,
    sessionHours: 12,
    origins: ['http://localhost:5173'],
  };
  db = await openDatabase(config);
  app = createApp({ db, config });
});
after(() => {
  db?.close();
  if (directory) fs.rmSync(directory, { recursive: true, force: true });
});
test('extracts Chinese, English, reversed and custom alphanumeric codes', () => {
  assert.equal(extractCode('【银行】验证码：１２３４５６，5分钟有效'), '123456');
  assert.equal(extractCode('Your verification code is 654321.'), '654321');
  assert.equal(extractCode('123456 是你的验证码'), '123456');
  assert.equal(
    extractCode('登录口令 A1B2C3', {
      keyword: '登录口令',
      alphabet: 'alphanumeric',
      code_length: 6,
    }),
    'A1B2C3',
  );
  assert.equal(extractCode('订单 123456 已发货'), null);
  assert.equal(extractCode('验证码已发送到手机号 13800138000，请联系客服 10086'), null);
  assert.equal(signatureOf('【示例服务】验证码1234', '1069'), '示例服务');
  assert.equal(signatureOf('验证码1234', '1069'), '1069');
});
test('AES-GCM randomizes ciphertext and rejects tampering, wrong key or context', () => {
  const box = cipherBox(randomBytes(32));
  const value = { code: '123456', body: 'secret' };
  const a = box.encrypt(value, 'one'),
    b = box.encrypt(value, 'one');
  assert.notEqual(a, b);
  assert.deepEqual(box.decrypt(a, 'one'), value);
  assert.throws(() => box.decrypt(a, 'two'));
  assert.throws(() => cipherBox(randomBytes(32)).decrypt(a, 'one'));
  const pieces = a.split('.');
  const ciphertext = Buffer.from(pieces[3], 'base64');
  ciphertext[0] ^= 1;
  pieces[3] = ciphertext.toString('base64');
  assert.throws(() => box.decrypt(pieces.join('.'), 'one'));
});
test('admin login, unauthorized access, cookie and origin security', async () => {
  assert.equal((await request(app).get('/api/admin/devices')).status, 401);
  assert.equal(
    (await request(app).post('/api/admin/login').send({ username: 'admin', password: 'wrong' }))
      .status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/admin/login')
        .set('Origin', 'https://evil.example')
        .send({ username: 'admin', password: adminPassword })
    ).status,
    403,
  );
  const response = await request(app)
    .post('/api/admin/login')
    .send({ username: 'admin', password: initialPassword });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.mustChangePassword, true);
  assert.equal(response.body.data.role, 'super_admin');
  cookie = response.headers['set-cookie'][0].split(';')[0];
  csrf = response.body.data.csrfToken;
  assert.match(response.headers['set-cookie'][0], /HttpOnly/);
  assert.match(response.headers['set-cookie'][0], /SameSite=Strict/);
  assert.equal(
    (await request(app).post('/api/admin/devices').set('Cookie', cookie).send({ name: 'no csrf' }))
      .status,
    403,
  );
});
test('initial admin cannot access management until a different password is set', async () => {
  assert.equal((await getAdmin('/me')).body.data.mustChangePassword, true);
  for (const route of [
    '/overview',
    '/messages',
    '/devices',
    '/tokens',
    '/audits',
    '/settings',
    '/rules',
  ]) {
    const response = await getAdmin(route);
    assert.equal(response.status, 403);
    assert.equal(response.body.error.code, 'PASSWORD_CHANGE_REQUIRED');
  }
  assert.equal((await postAdmin('/devices').send({ name: 'blocked' })).status, 403);
  assert.equal(
    (
      await postAdmin('/password').send({
        currentPassword: initialPassword,
        newPassword: initialPassword,
      })
    ).body.error.code,
    'PASSWORD_UNCHANGED',
  );
  assert.equal(
    (await postAdmin('/password').send({ currentPassword: initialPassword, newPassword: 'short' }))
      .status,
    400,
  );
  assert.equal(
    (
      await postAdmin('/password').send({
        currentPassword: 'incorrect',
        newPassword: adminPassword,
      })
    ).status,
    400,
  );
  const second = await request(app)
    .post('/api/admin/login')
    .send({ username: 'admin', password: initialPassword });
  const secondCookie = second.headers['set-cookie'][0].split(';')[0];
  assert.equal(
    (
      await postAdmin('/password').send({
        currentPassword: initialPassword,
        newPassword: adminPassword,
      })
    ).status,
    200,
  );
  assert.equal((await getAdmin('/me')).status, 401);
  assert.equal((await request(app).get('/api/admin/me').set('Cookie', secondCookie)).status, 401);
  assert.equal(
    (
      await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: initialPassword })
    ).status,
    401,
  );
  const login = await request(app)
    .post('/api/admin/login')
    .send({ username: 'admin', password: adminPassword });
  assert.equal(login.status, 200);
  assert.equal(login.body.data.mustChangePassword, false);
  cookie = login.headers['set-cookie'][0].split(';')[0];
  csrf = login.body.data.csrfToken;
  assert.equal((await getAdmin('/overview')).status, 200);
});
test('creates device-bound upload tokens and scoped query token', async () => {
  const a = await postAdmin('/devices').send({ name: 'Android A' });
  assert.equal(a.status, 201);
  deviceA = a.body.data;
  const b = await postAdmin('/devices').send({ name: 'Android B' });
  assert.equal(b.status, 201);
  deviceB = b.body.data;
  assert.equal(
    (await request(app).get('/api/v1/device').auth(deviceA.uploadToken, { type: 'bearer' })).body
      .data.id,
    deviceA.id,
  );
  const q = await postAdmin('/tokens').send({
    name: 'QA query',
    signatures: ['示例服务'],
    deviceIds: [deviceA.id],
  });
  assert.equal(q.status, 201);
  queryToken = q.body.data.token;
  queryId = q.body.data.id;
  const invalid = await postAdmin('/tokens').send({
    name: 'Invalid',
    signatures: ['*', '示例服务'],
  });
  assert.equal(invalid.status, 400);
  const listed = await getAdmin('/tokens');
  assert.ok(listed.body.data.every((v) => !('hash' in v) && !('token' in v)));
  const raw = db.prepare('SELECT hash FROM tokens WHERE id=?').get(queryId);
  assert.notEqual(raw.hash, queryToken);
});
test('encrypted uploads, deduplication and malformed input rejection', async () => {
  const clientMessageId = randomUUID();
  const first = await upload(deviceA, { clientMessageId });
  assert.equal(first.status, 201);
  messageId = first.body.data.id;
  const duplicate = await upload(deviceA, { clientMessageId });
  assert.equal(duplicate.status, 200);
  assert.equal(duplicate.body.data.duplicate, true);
  assert.equal(duplicate.body.data.id, messageId);
  const row = db.prepare('SELECT * FROM messages WHERE id=?').get(messageId);
  assert.equal(row.ciphertext.includes('123456'), false);
  assert.equal(row.ciphertext.includes('您的'), false);
  assert.equal((await upload(deviceA, { body: '订单123456已发货' })).status, 422);
  assert.equal((await upload(deviceA, { receivedAt: Date.now() + 600000 })).status, 422);
  assert.equal((await upload(deviceA, { receivedAt: Date.now() - 31 * 86400000 })).status, 422);
  assert.equal((await upload(deviceA, { deviceId: deviceB.id })).status, 400);
  assert.equal(
    (
      await request(app)
        .post('/api/v1/sms')
        .auth(deviceA.uploadToken, { type: 'bearer' })
        .set('Content-Type', 'application/json')
        .send('{bad')
    ).status,
    400,
  );
});
test('latest code applies signature/device scope, token type and age', async () => {
  await upload(deviceB, { body: '【示例服务】验证码 999999', receivedAt: Date.now() - 100 });
  const latest = await request(app)
    .get('/api/v1/codes/latest')
    .auth(queryToken, { type: 'bearer' })
    .query({ signature: '示例服务' });
  assert.equal(latest.status, 200);
  assert.equal(latest.body.data.code, '123456');
  assert.equal(latest.body.data.deviceId, deviceA.id);
  const query = (params) =>
    request(app).get('/api/v1/codes/latest').auth(queryToken, { type: 'bearer' }).query(params);
  assert.equal((await query({ signature: '支付宝' })).status, 403);
  assert.equal((await query({ signature: '示例服务', deviceId: deviceB.id })).status, 403);
  assert.equal(
    (
      await request(app)
        .get('/api/v1/codes/latest')
        .auth(deviceA.uploadToken, { type: 'bearer' })
        .query({ signature: '示例服务' })
    ).status,
    403,
  );
  assert.equal(
    (await request(app).post('/api/v1/sms').auth(queryToken, { type: 'bearer' }).send({})).status,
    403,
  );
  await upload(deviceA, { body: '【过期服务】验证码 112233', receivedAt: Date.now() - 700000 });
  const expired = await postAdmin('/tokens').send({ name: 'expiry', signatures: ['过期服务'] });
  assert.equal(
    (
      await request(app)
        .get('/api/v1/codes/latest')
        .auth(expired.body.data.token, { type: 'bearer' })
        .query({ signature: '过期服务', maxAgeSeconds: 86400 })
    ).status,
    404,
  );
});
test('records successful, denied, anonymous and malformed calls without secrets', async () => {
  await request(app).get('/api/v1/codes/latest').query({ signature: '示例服务' });
  const response = await getAdmin('/audits?action=query');
  assert.equal(response.status, 200);
  const statuses = response.body.data.items.map((v) => v.status);
  assert.ok(
    statuses.includes(200) &&
      statuses.includes(401) &&
      statuses.includes(403) &&
      statuses.includes(404),
  );
  const serialized = JSON.stringify(response.body);
  assert.equal(serialized.includes(queryToken), false);
  assert.equal(serialized.includes('123456'), false);
  assert.ok(
    db.prepare("SELECT COUNT(*) n FROM audits WHERE action='upload' AND status=400").get().n >= 1,
  );
});
test('message list masks codes, detail reveal is audited, parameterized filters', async () => {
  const list = await getAdmin('/messages');
  assert.equal(list.status, 200);
  assert.ok(list.body.data.items.every((v) => /^[•]+$/.test(v.code) && !('body' in v)));
  const detail = await getAdmin(`/messages/${messageId}`);
  assert.equal(detail.body.data.code, '123456');
  assert.ok(
    db
      .prepare("SELECT COUNT(*) n FROM audits WHERE action='admin.reveal' AND message_id=?")
      .get(messageId).n > 0,
  );
  assert.equal((await getAdmin('/messages?signature=%27%20OR%201%3D1--')).body.data.total, 0);
  assert.equal((await getAdmin('/messages?page=-1')).status, 400);
});
test('disabled devices block upload and code retrieval; rotation revokes old token', async () => {
  await postAdmin(`/devices/${deviceA.id}`, 'patch').send({ name: 'Android A', enabled: false });
  assert.equal((await upload(deviceA)).status, 403);
  assert.equal(
    (
      await request(app)
        .get('/api/v1/codes/latest')
        .auth(queryToken, { type: 'bearer' })
        .query({ signature: '示例服务' })
    ).status,
    404,
  );
  await postAdmin(`/devices/${deviceA.id}`, 'patch').send({ name: 'Android A', enabled: true });
  const rotated = await postAdmin(`/devices/${deviceA.id}/rotate-token`).send({});
  assert.equal(rotated.status, 200);
  assert.equal((await upload(deviceA)).status, 401);
  deviceA.uploadToken = rotated.body.data.uploadToken;
  assert.equal((await upload(deviceA)).status, 201);
});
test('custom extraction rules, settings and retention cleanup', async () => {
  assert.equal(
    (
      await postAdmin('/rules', 'put').send({
        signature: '自定义',
        keyword: '登录口令',
        codeLength: 6,
        alphabet: 'alphanumeric',
      })
    ).status,
    200,
  );
  assert.equal((await upload(deviceA, { body: '【自定义】登录口令 A1B2C3' })).status, 201);
  assert.equal(
    (
      await postAdmin('/settings', 'put').send({
        retentionDays: 0,
        auditRetentionDays: 90,
        codeMaxAgeSeconds: 600,
      })
    ).status,
    400,
  );
  db.prepare('UPDATE messages SET received_at=? WHERE id=?').run(
    Date.now() - 40 * 86400000,
    messageId,
  );
  cleanup(db);
  assert.equal(db.prepare('SELECT id FROM messages WHERE id=?').get(messageId), undefined);
});
test('query token revocation and expiry are enforced', async () => {
  await postAdmin(`/tokens/${queryId}`, 'delete');
  assert.equal(
    (
      await request(app)
        .get('/api/v1/codes/latest')
        .auth(queryToken, { type: 'bearer' })
        .query({ signature: '示例服务' })
    ).status,
    401,
  );
  const response = await postAdmin('/tokens').send({
    name: 'expired',
    signatures: ['*'],
    expiresAt: Date.now() + 50000,
  });
  db.prepare('UPDATE tokens SET expires_at=? WHERE id=?').run(
    Date.now() - 1,
    response.body.data.id,
  );
  assert.equal(
    (
      await request(app)
        .get('/api/v1/codes/latest')
        .auth(response.body.data.token, { type: 'bearer' })
        .query({ signature: '示例服务' })
    ).status,
    401,
  );
});
test('password change revokes all sessions and new credentials work', async () => {
  assert.equal(
    (
      await postAdmin('/password').send({
        currentPassword: 'wrong',
        newPassword: 'new-integration-password',
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await postAdmin('/password').send({
        currentPassword: adminPassword,
        newPassword: 'new-integration-password',
      })
    ).status,
    200,
  );
  assert.equal((await getAdmin('/me')).status, 401);
  assert.equal(
    (
      await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: adminPassword })
    ).status,
    401,
  );
  assert.equal(
    (
      await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'new-integration-password' })
    ).status,
    200,
  );
});

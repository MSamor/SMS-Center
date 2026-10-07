import Database from 'better-sqlite3';
import { hashPassword, secret, digest } from './crypto.js';
export async function openDatabase(config) {
  const db = new Database(config.dbPath);
  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');
    db.exec(`
      CREATE TABLE IF NOT EXISTS admins (username TEXT PRIMARY KEY, password_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, username TEXT NOT NULL, csrf TEXT NOT NULL, expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS devices (id TEXT PRIMARY KEY, name TEXT NOT NULL, enabled INTEGER NOT NULL DEFAULT 1, created_at INTEGER NOT NULL, last_seen_at INTEGER);
      CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, hash TEXT NOT NULL UNIQUE, prefix TEXT NOT NULL,
        kind TEXT NOT NULL CHECK(kind IN ('upload','query')), device_id TEXT REFERENCES devices(id),
        signatures TEXT NOT NULL DEFAULT '[]', device_ids TEXT NOT NULL DEFAULT '[]',
        created_at INTEGER NOT NULL, expires_at INTEGER, revoked_at INTEGER, last_used_at INTEGER
      );
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY, device_id TEXT NOT NULL REFERENCES devices(id), client_id TEXT NOT NULL,
        signature TEXT NOT NULL, ciphertext TEXT NOT NULL, received_at INTEGER NOT NULL, uploaded_at INTEGER NOT NULL,
        UNIQUE(device_id, client_id)
      );
      CREATE INDEX IF NOT EXISTS messages_latest ON messages(signature, received_at DESC, uploaded_at DESC);
      CREATE INDEX IF NOT EXISTS messages_device ON messages(device_id, received_at DESC);
      CREATE INDEX IF NOT EXISTS messages_retention ON messages(received_at);
      CREATE TABLE IF NOT EXISTS audits (
        id INTEGER PRIMARY KEY AUTOINCREMENT, token_id TEXT, token_name TEXT, action TEXT NOT NULL,
        signature TEXT, device_id TEXT, status INTEGER NOT NULL, ip TEXT NOT NULL, duration_ms INTEGER NOT NULL,
        message_id TEXT, created_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS audits_created ON audits(created_at DESC);
      CREATE TABLE IF NOT EXISTS rules (
        signature TEXT PRIMARY KEY, keyword TEXT NOT NULL DEFAULT '', code_length INTEGER NOT NULL DEFAULT 0,
        alphabet TEXT NOT NULL DEFAULT 'digits', updated_at INTEGER NOT NULL
      );

    `);
    // Upgrade databases from v1 without replacing accounts, passwords or SMS data.
    db.transaction(() => {
      const columns = db
        .prepare('PRAGMA table_info(admins)')
        .all()
        .map((column) => column.name);
      if (!columns.includes('role'))
        db.exec("ALTER TABLE admins ADD COLUMN role TEXT NOT NULL DEFAULT 'super_admin'");
      if (!columns.includes('must_change_password'))
        db.exec('ALTER TABLE admins ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1');
      db.pragma('user_version = 2');
    })();
    const box = config.box;
    const keyCheck = db.prepare("SELECT value FROM settings WHERE key='keyCheck'").get();
    if (keyCheck) {
      if (box.decrypt(keyCheck.value, 'key-check') !== 'sms-center')
        throw new Error('Wrong encryption key');
    } else
      db.prepare('INSERT INTO settings VALUES (?,?)').run(
        'keyCheck',
        box.encrypt('sms-center', 'key-check'),
      );
    if (!db.prepare('SELECT username FROM admins LIMIT 1').get()) {
      let password = config.password;
      if (!password) {
        password = secret('admin');
        console.log(
          `首次初始化超级管理员：${config.username}\n临时密码（仅显示一次）：${password}`,
        );
      }
      if (password.length < 12) throw new Error('ADMIN_PASSWORD must be at least 12 characters');
      db.prepare(
        'INSERT INTO admins (username,password_hash,role,must_change_password) VALUES (?,?,?,?)',
      ).run(config.username, await hashPassword(password), 'super_admin', 1);
      console.log(
        `超级管理员 ${config.username} 已初始化；首次登录必须修改密码后才能使用管理功能。`,
      );
    }
    for (const [key, value] of Object.entries({
      retentionDays: 30,
      auditRetentionDays: 90,
      codeMaxAgeSeconds: 600,
    })) {
      db.prepare('INSERT OR IGNORE INTO settings VALUES (?,?)').run(key, JSON.stringify(value));
    }
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}
export function getSettings(db) {
  return Object.fromEntries(
    db
      .prepare(
        "SELECT key,value FROM settings WHERE key IN ('retentionDays','auditRetentionDays','codeMaxAgeSeconds')",
      )
      .all()
      .map((v) => [v.key, JSON.parse(v.value)]),
  );
}
export function cleanup(db) {
  const settings = getSettings(db),
    now = Date.now();
  db.transaction(() => {
    db.prepare('DELETE FROM messages WHERE received_at < ?').run(
      now - settings.retentionDays * 86400000,
    );
    db.prepare('DELETE FROM audits WHERE created_at < ?').run(
      now - settings.auditRetentionDays * 86400000,
    );
    db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
  })();
}
export function tokenRecord(row) {
  return {
    id: row.id,
    name: row.name,
    prefix: row.prefix,
    kind: row.kind,
    deviceId: row.device_id,
    signatures: JSON.parse(row.signatures),
    deviceIds: JSON.parse(row.device_ids),
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    revokedAt: row.revoked_at,
    lastUsedAt: row.last_used_at,
  };
}
export function issueToken(
  db,
  { id, name, kind, deviceId = null, signatures = [], deviceIds = [], expiresAt = null },
) {
  const value = secret(kind === 'upload' ? 'upl' : 'qry');
  db.prepare(
    `INSERT INTO tokens (id,name,hash,prefix,kind,device_id,signatures,device_ids,created_at,expires_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    name,
    digest(value),
    value.slice(0, 12),
    kind,
    deviceId,
    JSON.stringify(signatures),
    JSON.stringify(deviceIds),
    Date.now(),
    expiresAt,
  );
  return { token: value, ...tokenRecord(db.prepare('SELECT * FROM tokens WHERE id=?').get(id)) };
}

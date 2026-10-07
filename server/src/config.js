import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(serverRoot, '.env'), quiet: true });
export function loadConfig() {
  const dataDir = path.resolve(serverRoot, process.env.DATA_DIR || 'data');
  fs.mkdirSync(dataDir, { recursive: true, mode: 0o700 });
  const keyFile = path.join(dataDir, 'encryption.key');
  let key;
  if (process.env.ENCRYPTION_KEY) {
    if (!/^[A-Za-z0-9+/]{43}=$/.test(process.env.ENCRYPTION_KEY))
      throw new Error('ENCRYPTION_KEY must be 32-byte base64');
    key = Buffer.from(process.env.ENCRYPTION_KEY, 'base64');
  } else if (fs.existsSync(keyFile))
    key = Buffer.from(fs.readFileSync(keyFile, 'utf8').trim(), 'base64');
  else {
    if (fs.existsSync(path.join(dataDir, 'sms-center.sqlite')))
      throw new Error('Database exists but encryption.key is missing; restore the original key');
    key = randomBytes(32);
    fs.writeFileSync(keyFile, key.toString('base64'), { mode: 0o600, flag: 'wx' });
  }
  if (key.length !== 32) throw new Error('Invalid encryption key');
  const production = process.env.NODE_ENV === 'production';
  const origins = (
    process.env.ADMIN_ORIGINS ||
    (production
      ? ''
      : 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000')
  )
    .split(',')
    .filter(Boolean)
    .map((v) => new URL(v.trim()).origin);
  if (production && (!origins.length || origins.some((v) => !v.startsWith('https://'))))
    throw new Error('Production ADMIN_ORIGINS must contain HTTPS origins');
  const sessionHours = Number(process.env.SESSION_HOURS || 12);
  if (!Number.isInteger(sessionHours) || sessionHours < 1 || sessionHours > 168)
    throw new Error('SESSION_HOURS must be 1..168');
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  const username = (process.env.ADMIN_USERNAME || 'admin').trim();
  const password = process.env.ADMIN_PASSWORD || '';
  if (!username || username.length > 64) throw new Error('ADMIN_USERNAME must be 1..64 characters');
  if (password && (password.length < 12 || password.length > 256))
    throw new Error('ADMIN_PASSWORD must be 12..256 characters');
  return {
    dataDir,
    dbPath: path.join(dataDir, 'sms-center.sqlite'),
    key,
    production,
    origins,
    sessionHours,
    username,
    password,
    trustProxy: process.env.TRUST_PROXY === '1' ? 1 : false,
    port,
    host: process.env.HOST || '0.0.0.0',
  };
}

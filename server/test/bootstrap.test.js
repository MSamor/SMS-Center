import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { cipherBox, hashPassword, verifyPassword } from '../src/crypto.js';
import { openDatabase } from '../src/db.js';
import { createApp } from '../src/app.js';

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-bootstrap-'));
  const config = {
    dbPath: path.join(directory, 'test.sqlite'),
    box: cipherBox(randomBytes(32)),
    username: 'root-admin',
    password: 'configured-initial-password',
    production: true,
    testing: true,
    sessionHours: 12,
    origins: ['https://sms.example.com'],
  };
  return { directory, config };
}
test('initial super admin persists changed password and state across restart', async () => {
  const { directory, config } = fixture();
  let db;
  try {
    db = await openDatabase(config);
    const initial = db.prepare('SELECT * FROM admins').get();
    assert.equal(initial.role, 'super_admin');
    assert.equal(initial.must_change_password, 1);
    assert.equal(await verifyPassword(config.password, initial.password_hash), true);
    db.prepare('UPDATE admins SET password_hash=?,must_change_password=0 WHERE username=?').run(
      await hashPassword('changed-bootstrap-password'),
      config.username,
    );
    db.close();
    db = await openDatabase({
      ...config,
      password: 'different-environment-password',
      username: 'other-name',
    });
    const saved = db.prepare('SELECT * FROM admins').get();
    assert.equal(saved.username, config.username);
    assert.equal(saved.must_change_password, 0);
    assert.equal(await verifyPassword('changed-bootstrap-password', saved.password_hash), true);
    assert.equal(db.prepare('SELECT COUNT(*) n FROM admins').get().n, 1);
  } finally {
    db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test('migrates v1 administrator without resetting password and requires one password change', async () => {
  const { directory, config } = fixture();
  let db;
  try {
    const previous = new Database(config.dbPath);
    previous.exec(
      'CREATE TABLE admins (username TEXT PRIMARY KEY,password_hash TEXT NOT NULL); PRAGMA user_version=1',
    );
    const hash = await hashPassword('legacy-admin-password');
    previous.prepare('INSERT INTO admins VALUES (?,?)').run('legacy', hash);
    previous.close();
    db = await openDatabase(config);
    const admin = db.prepare('SELECT * FROM admins').get();
    assert.equal(admin.username, 'legacy');
    assert.equal(admin.password_hash, hash);
    assert.equal(admin.role, 'super_admin');
    assert.equal(admin.must_change_password, 1);
    assert.equal(db.pragma('user_version', { simple: true }), 2);
  } finally {
    db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
test('single Node service serves public assets, SPA and API without serving data files', async () => {
  const { directory, config } = fixture();
  let db;
  try {
    const publicDir = path.join(directory, 'public');
    fs.mkdirSync(publicDir);
    fs.writeFileSync(
      path.join(publicDir, 'index.html'),
      '<!doctype html><title>SMS Center</title>',
    );
    fs.writeFileSync(path.join(publicDir, 'app.js'), 'window.app = true;');
    fs.writeFileSync(path.join(directory, 'encryption.key'), 'PRIVATE_TEST_KEY');
    db = await openDatabase(config);
    const app = createApp({ db, config: { ...config, publicDir } });
    const page = await request(app).get('/');
    assert.equal(page.status, 200);
    assert.match(page.text, /SMS Center/);
    assert.equal((await request(app).get('/app.js')).status, 200);
    assert.equal((await request(app).get('/devices').set('Accept', 'text/html')).status, 200);
    assert.equal((await request(app).get('/missing.js')).status, 404);
    assert.equal((await request(app).get('/encryption.key')).status, 404);
    assert.equal((await request(app).get('/api/health')).body.data.status, 'ok');
    assert.equal((await request(app).get('/api/unknown')).body.error.code, 'NOT_FOUND');
    const missing = createApp({
      db,
      config: { ...config, publicDir: path.join(directory, 'missing') },
    });
    assert.equal((await request(missing).get('/')).status, 503);
  } finally {
    db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

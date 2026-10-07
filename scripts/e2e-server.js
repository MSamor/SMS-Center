import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { cipherBox } from '../server/src/crypto.js';
import { openDatabase } from '../server/src/db.js';
import { createApp } from '../server/src/app.js';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-center-e2e-'));
const config = {
  dbPath: path.join(directory, 'test.sqlite'),
  box: cipherBox(randomBytes(32)),
  username: 'admin',
  password: 'e2e-only-admin-password',
  production: false,
  testing: true,
  sessionHours: 12,
  origins: ['http://127.0.0.1:3101'],
};
const db = await openDatabase(config);
const server = createApp({ db, config }).listen(3101, '127.0.0.1');
const stop = () =>
  server.close(() => {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
    process.exit(0);
  });
process.on('SIGTERM', stop);
process.on('SIGINT', stop);

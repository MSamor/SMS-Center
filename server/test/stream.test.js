import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { WebSocket } from 'ws';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { cipherBox } from '../src/crypto.js';
import { openDatabase } from '../src/db.js';
import { issueToken } from '../src/db.js';
import { createStream } from '../src/stream.js';

function message(ws) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('WebSocket message timeout')), 3000);
    ws.once('message', (data) => {
      clearTimeout(timeout);
      resolve(JSON.parse(data.toString()));
    });
  });
}

test('WebSocket pushes only new, authorized, valid codes; recent list follows server rules', async () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-stream-'));
  const config = {
    dbPath: path.join(directory, 'db.sqlite'),
    box: cipherBox(randomBytes(32)),
    username: 'admin',
    password: 'initial-test-password',
    production: false,
    testing: true,
    origins: [],
  };
  let db, stream, server;
  const clients = [];
  try {
    db = await openDatabase(config);
    const deviceA = randomUUID(),
      deviceB = randomUUID();
    const createDevice = db.prepare(
      'INSERT INTO devices (id,name,enabled,created_at) VALUES (?,?,1,?)',
    );
    createDevice.run(deviceA, 'A', Date.now());
    createDevice.run(deviceB, 'B', Date.now());
    const uploadA = issueToken(db, {
      id: randomUUID(),
      name: 'phone',
      kind: 'upload',
      deviceId: deviceA,
    });
    const uploadB = issueToken(db, {
      id: randomUUID(),
      name: 'phone B',
      kind: 'upload',
      deviceId: deviceB,
    });
    const readA = issueToken(db, {
      id: randomUUID(),
      name: 'browser',
      kind: 'query',
      signatures: ['示例'],
      deviceIds: [deviceA],
    });
    const readB = issueToken(db, {
      id: randomUUID(),
      name: 'another',
      kind: 'query',
      signatures: ['示例'],
      deviceIds: [deviceB],
    });
    const app = createApp({ db, config, publishMessage: (event) => stream.publish(event) });
    server = createServer(app);
    stream = createStream({ db, server });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const url = `ws://127.0.0.1:${server.address().port}/api/v1/codes/stream`;
    const connect = async (token) => {
      const ws = new WebSocket(url);
      clients.push(ws);
      await new Promise((resolve, reject) => {
        ws.once('open', resolve);
        ws.once('error', reject);
      });
      const ready = message(ws);
      ws.send(JSON.stringify({ type: 'auth', token }));
      assert.deepEqual(await ready, { type: 'ready' });
      return ws;
    };
    const a = await connect(readA.token),
      b = await connect(readB.token);
    const upload = (token, body, clientMessageId = randomUUID(), receivedAt = Date.now() - 1000) =>
      request(app)
        .post('/api/v1/sms')
        .auth(token, { type: 'bearer' })
        .send({ clientMessageId, sender: '10690', body, receivedAt });
    const eventA = message(a);
    const receivedAt = Date.now() - 1000;
    const first = await upload(uploadA.token, '【示例】验证码 123456', 'original', receivedAt);
    assert.equal(first.status, 201);
    assert.deepEqual(await eventA, {
      type: 'code.created',
      id: first.body.data.id,
      signature: '示例',
      deviceId: deviceA,
      receivedAt,
    });
    assert.equal(
      (await upload(uploadA.token, '【示例】验证码 123456', 'original')).body.data.duplicate,
      true,
    );
    assert.equal((await upload(uploadA.token, '【其他】验证码 234567')).status, 201);
    const eventB = message(b);
    assert.equal((await upload(uploadB.token, '【示例】验证码 345678')).status, 201);
    assert.equal((await eventB).deviceId, deviceB);
    const recent = (token, params = {}) =>
      request(app).get('/api/v1/codes/recent').auth(token, { type: 'bearer' }).query(params);
    const list = await recent(readA.token);
    assert.equal(list.status, 200);
    assert.equal(list.body.data.total, 1);
    assert.equal(list.body.data.items[0].code, '123456');
    assert.ok(list.body.data.items[0].expiresAt > list.body.data.serverTime);
    assert.equal((await recent(readA.token, { signature: '其他' })).status, 403);
    assert.equal((await recent(readA.token, { deviceId: deviceB })).status, 403);
    assert.equal((await recent(uploadA.token)).status, 403);
    assert.equal((await recent(readA.token, { pageSize: 101 })).status, 400);
    assert.equal((await recent(readA.token, { page: 2 })).body.data.total, 1);
    const expired = await upload(
      uploadA.token,
      '【示例】验证码 456789',
      randomUUID(),
      Date.now() - 700000,
    );
    assert.equal(expired.status, 201);
    assert.equal((await recent(readA.token)).body.data.total, 1);
    db.prepare('UPDATE tokens SET revoked_at=? WHERE id=?').run(Date.now(), readA.id);
    assert.equal((await recent(readA.token)).status, 401);
    await upload(uploadA.token, '【示例】验证码 567890');
    const closed = new Promise((resolve) => a.once('close', resolve));
    await closed;
    db.prepare('UPDATE devices SET enabled=0 WHERE id=?').run(deviceB);
    assert.equal((await recent(readB.token)).body.data.total, 0);
    const audit = db
      .prepare("SELECT COUNT(*) n FROM audits WHERE action='stream.push' AND token_id=?")
      .get(readA.id);
    assert.equal(audit.n, 1);
    assert.equal(
      db
        .prepare("SELECT COUNT(*) n FROM audits WHERE action='query.recent' AND token_id=?")
        .get(readA.id).n > 0,
      true,
    );
    assert.equal(
      JSON.stringify(db.prepare('SELECT * FROM audits').all()).includes(readA.token),
      false,
    );
    const unauth = new WebSocket(url);
    clients.push(unauth);
    await new Promise((resolve) => unauth.once('open', resolve));
    const unauthorized = new Promise((resolve) => unauth.once('close', resolve));
    unauth.send(JSON.stringify({ type: 'auth', token: uploadA.token }));
    assert.equal(await unauthorized, 4403);
  } finally {
    for (const client of clients) client.terminate();
    stream?.close();
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

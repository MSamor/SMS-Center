import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { serverAddress, recent, wsAddress } from '../common.js';

test('extension requests only configured HTTPS site (or loopback development)', () => {
  assert.equal(serverAddress(' https://sms.example.com/ '), 'https://sms.example.com');
  assert.equal(serverAddress('http://localhost:3000'), 'http://localhost:3000');
  for (const url of [
    'http://sms.example.com',
    'https://user:pass@sms.example.com',
    'https://sms.example.com/api',
    'https://sms.example.com?token=secret',
    'file:///tmp',
  ])
    assert.throws(() => serverAddress(url));
  assert.equal(wsAddress('https://sms.example.com'), 'wss://sms.example.com/api/v1/codes/stream');
  assert.equal(wsAddress('http://127.0.0.1:3000'), 'ws://127.0.0.1:3000/api/v1/codes/stream');
});

test('recent fetch uses Authorization header, never URL token, and reports errors', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async (url, init) => {
      assert.equal(url.origin, 'https://sms.example.com');
      assert.equal(url.searchParams.get('signature'), '测试');
      assert.equal(url.searchParams.get('page'), '2');
      assert.equal(init.headers.Authorization, 'Bearer qry_secret');
      assert.equal(url.href.includes('qry_secret'), false);
      return { ok: true, json: async () => ({ data: { items: [], total: 0 } }) };
    };
    assert.deepEqual(
      await recent({ serverUrl: 'https://sms.example.com', token: 'qry_secret' }, 2, 20, '测试'),
      { items: [], total: 0 },
    );
    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Token 已撤销' } }),
    });
    await assert.rejects(
      recent({ serverUrl: 'https://sms.example.com', token: 'qry_secret' }),
      /Token 已撤销/,
    );
  } finally {
    globalThis.fetch = original;
  }
});

test('release package includes valid MV3 manifest and required images', () => {
  const root = new URL('../', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('manifest.json', root), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.minimum_chrome_version, '127');
  assert.equal(manifest.action.default_popup, 'popup.html');
  for (const file of [
    'icon16.png',
    'icon48.png',
    'icon128.png',
    'options.html',
    'popup.html',
    'background.js',
  ])
    assert.ok(fs.statSync(new URL(file, root)).size > 0, file);
});

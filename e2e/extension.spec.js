import { test, expect, chromium } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createServer } from 'node:http';
import { randomBytes, randomUUID } from 'node:crypto';
import { createApp } from '../server/src/app.js';
import { createStream } from '../server/src/stream.js';
import { cipherBox } from '../server/src/crypto.js';
import { openDatabase, issueToken } from '../server/src/db.js';

test('unpacked Chrome extension connects, reacts to new SMS and shows only live codes', async ({
  request,
}) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'sms-extension-e2e-'));
  const extension = path.join(directory, 'extension');
  fs.cpSync(path.resolve('extension'), extension, { recursive: true });
  const config = {
    dbPath: path.join(directory, 'sms.sqlite'),
    box: cipherBox(randomBytes(32)),
    username: 'admin',
    password: 'extension-only-password',
    production: false,
    testing: true,
    origins: [],
  };
  let db, server, stream, browser;
  try {
    db = await openDatabase(config);
    const deviceId = randomUUID();
    db.prepare('INSERT INTO devices (id,name,enabled,created_at) VALUES (?,?,1,?)').run(
      deviceId,
      '测试手机',
      Date.now(),
    );
    const upload = issueToken(db, {
      id: randomUUID(),
      name: 'test upload',
      kind: 'upload',
      deviceId,
    });
    const query = issueToken(db, {
      id: randomUUID(),
      name: 'test extension',
      kind: 'query',
      signatures: ['浏览器测试'],
      deviceIds: [deviceId],
    });
    const app = createApp({ db, config, publishMessage: (message) => stream.publish(message) });
    server = createServer(app);
    stream = createStream({ server, db });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const serverUrl = `http://127.0.0.1:${server.address().port}`;
    // Headless Chrome cannot answer the optional host permission prompt.
    const manifestPath = path.join(extension, 'manifest.json');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.host_permissions = ['http://127.0.0.1/*'];
    manifest.optional_host_permissions = manifest.optional_host_permissions.filter(
      (pattern) => pattern !== 'http://127.0.0.1/*',
    );
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));
    const localChrome = '/Applications/360Chrome.app/Contents/MacOS/360Chrome';
    browser = await chromium.launchPersistentContext(path.join(directory, 'profile'), {
      headless: true,
      ...(fs.existsSync(localChrome) ? { executablePath: localChrome } : { channel: 'chromium' }),
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
    });
    const worker = browser.serviceWorkers()[0] || (await browser.waitForEvent('serviceworker'));
    const id = new URL(worker.url()).hostname;
    const options = await browser.newPage();
    await options.goto(`chrome-extension://${id}/options.html`);
    await expect(options.locator('#server-url')).toHaveValue('https://sms.wpaini.com');
    fs.mkdirSync('artifacts', { recursive: true });
    await options.locator('.options-shell').screenshot({ path: 'artifacts/extension-options.png' });
    await options.locator('#server-url').fill(serverUrl);
    await options.locator('#query-token').fill(query.token);
    await options.getByRole('button', { name: '验证并保存' }).click();
    await expect(options.getByText('连接已验证并保存。')).toBeVisible();
    await expect
      .poll(
        () =>
          db
            .prepare("SELECT COUNT(*) n FROM audits WHERE action='stream.connect' AND status=101")
            .get().n,
      )
      .toBe(1);
    const result = await request.post(`${serverUrl}/api/v1/sms`, {
      headers: { Authorization: `Bearer ${upload.token}` },
      data: {
        clientMessageId: 'browser-e2e-1',
        sender: '10690001',
        body: '【浏览器测试】验证码 639821',
        receivedAt: Date.now() - 1000,
      },
    });
    expect(result.status()).toBe(201);
    await expect
      .poll(() => db.prepare("SELECT COUNT(*) n FROM audits WHERE action='stream.push'").get().n)
      .toBe(1);
    await expect.poll(() => worker.evaluate(() => chrome.action.getBadgeText({}))).toBe('1');
    await expect
      .poll(async () => {
        const opened = browser
          .pages()
          .some((page) => page.url() === `chrome-extension://${id}/popup.html`);
        const notified = await worker.evaluate(
          async () => Object.keys(await chrome.notifications.getAll()).length > 0,
        );
        return opened || notified;
      })
      .toBe(true);
    const popup = await browser.newPage();
    await popup.goto(`chrome-extension://${id}/popup.html`);
    await expect(popup.getByText('639821')).toBeVisible();
    await popup.locator('body').screenshot({ path: 'artifacts/extension-popup.png' });
    await popup.getByRole('button', { name: '复制 浏览器测试 验证码' }).click();
    await expect(popup.getByText('已复制验证码')).toBeVisible();
    db.prepare('UPDATE messages SET received_at=? WHERE client_id=?').run(
      Date.now() - 700000,
      'browser-e2e-1',
    );
    await popup.getByRole('button', { name: '刷新记录' }).click();
    await expect(popup.getByText('当前没有有效验证码')).toBeVisible();
  } finally {
    await browser?.close();
    stream?.close();
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    db?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

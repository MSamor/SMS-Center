import { test, expect } from '@playwright/test';
test('login, device, upload, query token, messages, audit and responsive navigation', async ({
  page,
  request,
}) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('用户名', { exact: true }).fill('admin');
  await page.getByLabel('密码', { exact: true }).fill('e2e-only-admin-password');
  await page.getByRole('button', { name: '登录管理中心' }).click();
  await expect(page.getByRole('heading', { name: '设置你的新密码', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '设备管理', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: '设置你的新密码', exact: true })).toBeVisible();
  await page.getByLabel('初始密码', { exact: true }).fill('e2e-only-admin-password');
  await page.getByLabel('新密码', { exact: true }).fill('e2e-changed-admin-password');
  await page.getByLabel('确认新密码', { exact: true }).fill('e2e-changed-admin-password');
  await page.getByRole('button', { name: '修改密码并重新登录' }).click();
  await page.getByLabel('密码', { exact: true }).fill('e2e-changed-admin-password');
  await page.getByRole('button', { name: '登录管理中心' }).click();
  await expect(page.getByRole('heading', { name: '数据概览', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '设备管理', exact: true }).click();
  await page.getByRole('button', { name: '添加设备', exact: true }).first().click();
  await page.getByLabel('设备名称', { exact: true }).fill('联调 Android');
  await page.getByRole('button', { name: '保存设备', exact: true }).click();
  const uploadToken = await page.getByLabel('上传 Token', { exact: true }).inputValue();
  expect(uploadToken).toMatch(/^upl_/);
  await page.getByRole('button', { name: '已保存凭证', exact: true }).click();
  const uploaded = await request.post('/api/v1/sms', {
    headers: { Authorization: `Bearer ${uploadToken}` },
    data: {
      clientMessageId: 'browser-test-1',
      sender: '10690000',
      body: '【联调服务】验证码为 876543，5分钟内有效',
      receivedAt: Date.now() - 1000,
    },
  });
  expect(uploaded.status()).toBe(201);
  await page.getByRole('button', { name: '短信记录', exact: true }).click();
  await expect(page.getByText('联调服务', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '查看短信详情', exact: true }).click();
  await expect(page.getByText('876543', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关闭', exact: true }).click();
  await page.getByRole('button', { name: '访问凭证', exact: true }).click();
  await page.getByRole('button', { name: '分配查询 Token', exact: true }).first().click();
  await page.getByLabel('凭证名称', { exact: true }).fill('联调查询');
  await page.getByLabel('允许查询的短信签名', { exact: true }).fill('联调服务');
  await page.getByRole('button', { name: '生成 Token', exact: true }).click();
  const queryToken = await page.getByLabel('查询 Token', { exact: true }).inputValue();
  const latest = await request.get('/api/v1/codes/latest', {
    headers: { Authorization: `Bearer ${queryToken}` },
    params: { signature: '联调服务' },
  });
  expect(latest.status()).toBe(200);
  expect((await latest.json()).data.code).toBe('876543');
  await page.getByRole('button', { name: '已保存凭证', exact: true }).click();
  await page.getByRole('button', { name: '接口审计', exact: true }).click();
  await expect(page.getByRole('cell', { name: '联调查询', exact: false })).toBeVisible();
  await page.getByRole('button', { name: '系统设置', exact: true }).click();
  await expect(page.getByLabel('短信保留天数', { exact: true })).toHaveValue('30');
  await page.getByRole('button', { name: '数据概览', exact: true }).click();
  await expect(page.getByText('联调服务', { exact: true }).first()).toBeVisible();
  await page.screenshot({ path: 'artifacts/admin-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/admin-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('button', { name: '打开菜单' }).click();
  await page.getByRole('button', { name: '短信记录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '短信记录', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '短信记录', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

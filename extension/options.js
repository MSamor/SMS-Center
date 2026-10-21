import { recent, serverAddress } from './common.js';

const form = document.querySelector('#settings-form');
const server = document.querySelector('#server-url');
const tokenInput = document.querySelector('#query-token');
const status = document.querySelector('#status');
const note = document.querySelector('#token-note');
let saved = await chrome.storage.local.get(['serverUrl', 'token']);
server.value = saved.serverUrl || '';
if (saved.token)
  note.textContent = '已保存查询 Token。留空表示继续使用原凭证；输入新 Token 可替换。';

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#save');
  button.disabled = true;
  status.textContent = '正在验证连接…';
  status.className = 'status';
  try {
    const serverUrl = serverAddress(server.value);
    const token = tokenInput.value.trim() || saved.token;
    if (!/^qry_[A-Za-z0-9_-]{20,96}$/.test(token || ''))
      throw new Error('请输入有效的 qry_ 查询 Token。');
    const originPattern = `${serverUrl}/*`;
    const granted = await chrome.permissions.request({ origins: [originPattern] });
    if (!granted) throw new Error('未获服务站点访问权限，无法建立连接。');
    await recent({ serverUrl, token }, 1, 1);
    await chrome.storage.local.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' });
    await chrome.storage.local.set({ serverUrl, token });
    if (saved.serverUrl && saved.serverUrl !== serverUrl)
      await chrome.permissions.remove({ origins: [`${saved.serverUrl}/*`] });
    saved = { serverUrl, token };
    tokenInput.value = '';
    note.textContent = '已保存查询 Token。留空表示继续使用原凭证；输入新 Token 可替换。';
    status.textContent = '连接已验证并保存。';
    status.classList.add('success');
  } catch (error) {
    status.textContent = error.message;
    status.classList.add('error');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#clear').addEventListener('click', async () => {
  await chrome.storage.local.remove(['serverUrl', 'token']);
  if (saved.serverUrl) await chrome.permissions.remove({ origins: [`${saved.serverUrl}/*`] });
  saved = {};
  tokenInput.value = '';
  note.textContent = '在管理中心「访问凭证」中创建仅授权所需签名和设备的查询 Token。';
  status.textContent = '连接已移除。';
  status.className = 'status success';
});

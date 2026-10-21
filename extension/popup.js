import { recent } from './common.js';

const codes = document.querySelector('#codes');
const notice = document.querySelector('#notice');
const pagination = document.querySelector('#pagination');
const connection = document.querySelector('#connection-status');
let page = 1;
let signature = '';
let offset = 0;
let items = [];
let total = 0;
const port = chrome.runtime.connect({ name: 'popup' });
const fmt = (value) =>
  new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });

function render() {
  const now = Date.now() + offset;
  codes.replaceChildren();
  for (const item of items.filter((record) => record.expiresAt > now && record.receivedAt <= now)) {
    const article = document.createElement('article');
    article.className = 'code-item';
    const header = document.createElement('div');
    header.className = 'item-head';
    const title = document.createElement('strong');
    title.textContent = item.signature;
    const time = document.createElement('time');
    time.textContent = fmt(item.receivedAt);
    header.append(title, time);
    const main = document.createElement('div');
    main.className = 'item-main';
    const value = document.createElement('span');
    value.className = 'code-value';
    value.textContent = item.code;
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'copy-button';
    copy.textContent = '⧉';
    copy.title = '复制验证码';
    copy.setAttribute('aria-label', `复制 ${item.signature} 验证码`);
    copy.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(item.code);
        notice.textContent = '已复制验证码';
        notice.className = 'status success';
      } catch {
        notice.textContent = '复制失败，请检查剪贴板权限。';
        notice.className = 'status error';
      }
    });
    main.append(value, copy);
    const expiry = document.createElement('small');
    expiry.textContent = `有效至 ${fmt(item.expiresAt)}`;
    article.append(header, main, expiry);
    codes.append(article);
  }
  if (!codes.childElementCount && !notice.textContent) notice.textContent = '当前没有有效验证码';
  pagination.hidden = total <= 20;
  document.querySelector('#page-label').textContent = `${page} / ${Math.ceil(total / 20)}`;
  document.querySelector('#previous').disabled = page <= 1;
  document.querySelector('#next').disabled = page * 20 >= total;
}

async function refresh() {
  notice.textContent = '正在读取…';
  notice.className = 'status';
  const config = await chrome.storage.local.get(['serverUrl', 'token']);
  if (!config.serverUrl || !config.token) {
    items = [];
    total = 0;
    notice.textContent = '尚未连接服务中心';
    render();
    return;
  }
  try {
    const data = await recent(config, page, 20, signature);
    offset = data.serverTime - Date.now();
    items = data.items;
    total = data.total;
    notice.textContent = '';
    render();
  } catch (error) {
    items = [];
    total = 0;
    notice.textContent = error.message;
    notice.classList.add('error');
    render();
  }
}

document.querySelector('#refresh').addEventListener('click', refresh);
document
  .querySelector('#settings')
  .addEventListener('click', () => chrome.runtime.openOptionsPage());
document.querySelector('#filter').addEventListener('submit', (event) => {
  event.preventDefault();
  signature = document.querySelector('#signature').value.trim();
  page = 1;
  refresh();
});
document.querySelector('#previous').addEventListener('click', () => {
  page--;
  refresh();
});
document.querySelector('#next').addEventListener('click', () => {
  page++;
  refresh();
});
chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'codes.updated') refresh();
  if (message?.type === 'codes.status')
    connection.textContent = message.connected ? '实时连接中' : '连接中断 · 可手动刷新';
});
chrome.runtime
  .sendMessage({ type: 'status' })
  .then((state) => {
    connection.textContent = state?.connected ? '实时连接中' : '连接中断 · 可手动刷新';
  })
  .catch(() => {
    connection.textContent = '连接中断 · 可手动刷新';
  });
setInterval(render, 1000);
refresh();

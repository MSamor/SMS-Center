import { recent, wsAddress } from './common.js';

let socket;
let retryTimer;
let pingTimer;
let retryDelay = 1000;
let generation = 0;
let connected = false;
let authRejected = false;
let popupOpen = false;
let lastAlert = 0;
let lastAlertMode;
const alarmName = 'sms-center-check';

function sendRuntimeMessage(message) {
  try {
    const pending = chrome.runtime.sendMessage(message);
    pending?.catch?.(() => {});
  } catch {
    // No extension page is open to receive the update.
  }
}

async function recordAlert(mode) {
  lastAlertMode = mode;
  try {
    await chrome.storage.local.set({ lastAlertMode: mode });
  } catch {
    // Storage failure must not prevent the in-memory alert state from updating.
  }
}

async function withTimeout(promise, milliseconds, label) {
  let timer;
  try {
    await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timeout`)), milliseconds);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

async function badge(text, color) {
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeText({ text });
}

async function refreshCount() {
  const config = await chrome.storage.local.get(['serverUrl', 'token']);
  if (!config.serverUrl || !config.token) {
    await badge('', '#657373');
    return;
  }
  try {
    const data = await recent(config, 1, 1);
    await badge(data.total ? (data.total > 99 ? '99+' : String(data.total)) : '', '#087d65');
  } catch {
    await badge('!', '#b35b37');
  }
}

async function alertNewCode() {
  if (popupOpen || Date.now() - lastAlert < 5000) {
    await recordAlert('already-open');
    return;
  }
  lastAlert = Date.now();
  try {
    await withTimeout(chrome.action.openPopup(), 1500, 'openPopup');
    await recordAlert('popup');
  } catch {
    await recordAlert('notification');
    try {
      await withTimeout(
        chrome.notifications.create('sms-center-new-code', {
          type: 'basic',
          title: '收到新验证码',
          message: '打开 SMS Center 插件查看并复制。',
          iconUrl: 'icon128.png',
        }),
        1500,
        'notification',
      );
    } catch {
      await recordAlert('failed');
    }
  }
}

function disconnect() {
  generation++;
  connected = false;
  clearTimeout(retryTimer);
  clearInterval(pingTimer);
  if (socket) {
    const old = socket;
    socket = undefined;
    old.close();
  }
}

async function connect() {
  disconnect();
  const current = generation;
  const config = await chrome.storage.local.get(['serverUrl', 'token']);
  if (current !== generation || !config.serverUrl || !config.token) {
    await refreshCount();
    return;
  }
  let ws;
  try {
    ws = new WebSocket(wsAddress(config.serverUrl));
  } catch {
    scheduleRetry(current);
    return;
  }
  socket = ws;
  ws.onopen = () => {
    if (current === generation) ws.send(JSON.stringify({ type: 'auth', token: config.token }));
  };
  ws.onmessage = async ({ data }) => {
    if (current !== generation) return;
    let event;
    try {
      event = JSON.parse(data);
    } catch {
      return;
    }
    if (event.type === 'ready') {
      connected = true;
      authRejected = false;
      sendRuntimeMessage({ type: 'codes.status', connected: true });
      retryDelay = 1000;
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'ping' }));
      }, 20000);
      await refreshCount();
    } else if (event.type === 'code.created') {
      await refreshCount();
      sendRuntimeMessage({ type: 'codes.updated' });
      await alertNewCode();
    }
  };
  ws.onerror = () => {};
  ws.onclose = ({ code }) => {
    if (current !== generation) return;
    connected = false;
    sendRuntimeMessage({ type: 'codes.status', connected: false });
    clearInterval(pingTimer);
    if (code === 4401 || code === 4403) {
      authRejected = true;
      badge('!', '#b35b37');
      return;
    }
    scheduleRetry(current);
  };
}

function scheduleRetry(current) {
  if (current !== generation) return;
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => connect(), retryDelay);
  retryDelay = Math.min(retryDelay * 2, 60000);
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(alarmName, { periodInMinutes: 1 });
});
chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(alarmName, { periodInMinutes: 1 });
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== alarmName) return;
  if (authRejected) return;
  if (!socket || socket.readyState !== WebSocket.OPEN || !connected) connect();
  else refreshCount();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && (changes.token || changes.serverUrl)) {
    retryDelay = 1000;
    authRejected = false;
    connect();
  }
});
chrome.notifications.onClicked.addListener(async () => {
  try {
    await chrome.action.openPopup();
  } catch {
    await chrome.windows.create({
      url: chrome.runtime.getURL('popup.html'),
      type: 'popup',
      width: 410,
      height: 600,
    });
  }
  chrome.notifications.clear('sms-center-new-code');
});
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'popup') return;
  popupOpen = true;
  port.onDisconnect.addListener(() => {
    popupOpen = false;
  });
});
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === 'status') {
    sendResponse({ connected, lastAlertMode });
  } else if (message?.type === 'refresh') {
    refreshCount();
  }
});
chrome.storage.local.setAccessLevel?.({ accessLevel: 'TRUSTED_CONTEXTS' }).catch(() => {});
chrome.alarms.create(alarmName, { periodInMinutes: 1 });
connect();

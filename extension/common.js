export function serverAddress(value) {
  const url = new URL(value.trim());
  if (
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('请输入 HTTPS 服务根地址；本机开发可使用 localhost HTTP。');
  return url.origin;
}

export async function recent(config, page = 1, pageSize = 20, signature = '') {
  const url = new URL(`${config.serverUrl}/api/v1/codes/recent`);
  url.searchParams.set('page', page);
  url.searchParams.set('pageSize', pageSize);
  if (signature) url.searchParams.set('signature', signature);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${config.token}` },
    cache: 'no-store',
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`服务响应异常 (${response.status})`);
  }
  if (!response.ok) throw new Error(payload.error?.message || `服务请求失败 (${response.status})`);
  return payload.data;
}

export function wsAddress(serverUrl) {
  const url = new URL(serverUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/api/v1/codes/stream';
  return url.href;
}

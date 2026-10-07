import { reactive } from 'vue';
export const session = reactive({
  username: '',
  csrfToken: '',
  role: '',
  mustChangePassword: false,
});
export async function api(path, { method = 'GET', body, query, signal } = {}) {
  const url = new URL(`/api/admin${path}`, window.location.origin);
  if (query)
    for (const [key, value] of Object.entries(query))
      if (value !== undefined && value !== null && value !== '')
        url.searchParams.set(key, String(value));
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') headers['X-CSRF-Token'] = session.csrfToken;
  const response = await fetch(url, {
    method,
    headers,
    credentials: 'same-origin',
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') {
      session.username = '';
      session.csrfToken = '';
      session.mustChangePassword = false;
      session.role = '';
    }
    if (json.error?.code === 'PASSWORD_CHANGE_REQUIRED') session.mustChangePassword = true;
    const error = new Error(json.error?.message || `请求失败（${response.status}）`);
    error.status = response.status;
    throw error;
  }
  return json.data;
}
export const time = (value) =>
  value ? new Date(value).toLocaleString('zh-CN', { hour12: false }) : '—';
export async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
  const input = document.createElement('textarea');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.append(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('复制失败，请手动复制');
}

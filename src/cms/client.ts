function csrfToken() {
  const match = document.cookie.match(/(?:^|; )dz_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : '';
}

async function request(url: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (init.method && init.method !== 'GET' && init.method !== 'HEAD') {
    headers.set('X-CSRF-Token', csrfToken());
  }
  const response = await fetch(url, { ...init, headers, credentials: 'include' });
  if (response.status === 401) {
    const error = new Error('Authentication required.');
    (error as Error & { status: number }).status = 401;
    throw error;
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : 'Request failed.');
  return data;
}

export const api = {
  publicContent: () => fetch('/api/content').then(response => {
    if (!response.ok) throw new Error('unavailable');
    return response.json();
  }),
  setupNeeded: () => request('/api/admin/setup-needed'),
  session: () => request('/api/admin/session'),
  setup: (email: string, password: string) => request('/api/admin/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }),
  login: (email: string, password: string) => request('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) }),
  logout: () => request('/api/admin/logout', { method: 'POST' }),
  content: () => request('/api/admin/content'),
  saveContent: (content: unknown) => request('/api/admin/content', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(content) }),
  password: (current: string, next: string) => request('/api/admin/password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ current, next }) }),
  audit: () => request('/api/admin/audit'),
  upload: async (file: File) => {
    const buffer = await file.arrayBuffer();
    return request('/api/admin/upload', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-CSRF-Token': csrfToken() }, body: buffer });
  },
  removeMedia: (id: string) => request(`/api/admin/media/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

export function mediaUrl(id: string) {
  return id ? `/api/media/${encodeURIComponent(id)}` : '';
}

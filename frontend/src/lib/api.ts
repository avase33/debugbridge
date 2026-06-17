import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: BASE, timeout: 30_000 });

// Attach access token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('db_access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401 TOKEN_EXPIRED
let refreshing: Promise<string> | null = null;
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;
    if (err.response?.status === 401 && err.response?.data?.code === 'TOKEN_EXPIRED' && !original._retry) {
      original._retry = true;
      if (!refreshing) {
        const rt = localStorage.getItem('db_refresh_token');
        refreshing = api.post('/auth/refresh', { refreshToken: rt })
          .then((r) => {
            localStorage.setItem('db_access_token', r.data.accessToken);
            return r.data.accessToken;
          })
          .finally(() => { refreshing = null; });
      }
      try {
        const token = await refreshing;
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.removeItem('db_access_token');
        localStorage.removeItem('db_refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

// ── Auth API ────────────────────────────────────────────────────────────────
export const authApi = {
  register: (data: { email: string; username: string; password: string; fullName?: string }) =>
    api.post('/auth/register', data).then((r) => r.data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }).then((r) => r.data),
  me: () => api.get('/auth/me').then((r) => r.data),
  updateMe: (data: Partial<{ fullName: string; avatarUrl: string }>) =>
    api.patch('/auth/me', data).then((r) => r.data),
};

// ── Snapshots API ───────────────────────────────────────────────────────────
export const snapshotsApi = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/snapshots', { params }).then((r) => r.data),
  listPublic: (params?: { page?: number; limit?: number }) =>
    api.get('/snapshots/public', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/snapshots/${id}`).then((r) => r.data),
  create: (payload: Record<string, unknown>) =>
    api.post('/snapshots', payload).then((r) => r.data),
  update: (id: string, data: { label?: string; isPublic?: boolean }) =>
    api.patch(`/snapshots/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/snapshots/${id}`).then((r) => r.data),
  getBridge: (id: string) => api.get(`/snapshots/${id}/bridge`).then((r) => r.data),
  diff: (idA: string, idB: string) =>
    api.post(`/snapshots/${idA}/diff/${idB}`).then((r) => r.data),
  bridgeDownloadUrl: (id: string, file: string) => `${BASE}/snapshots/${id}/bridge?file=${file}`,
};

// ── Sessions API ────────────────────────────────────────────────────────────
export const sessionsApi = {
  list: (params?: { page?: number; limit?: number; status?: string; search?: string }) =>
    api.get('/sessions', { params }).then((r) => r.data),
  listPublic: (params?: { page?: number; limit?: number }) =>
    api.get('/sessions/public', { params }).then((r) => r.data),
  get: (id: string) => api.get(`/sessions/${id}`).then((r) => r.data),
  create: (data: { title: string; description?: string; errorMessage?: string; errorStack?: string; reproSteps?: string; isPublic?: boolean; tags?: string[] }) =>
    api.post('/sessions', data).then((r) => r.data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/sessions/${id}`, data).then((r) => r.data),
  remove: (id: string) => api.delete(`/sessions/${id}`).then((r) => r.data),
  attachSnapshot: (sessionId: string, snapshotId: string, role: 'reporter' | 'compare' = 'compare') =>
    api.post(`/sessions/${sessionId}/snapshots`, { snapshotId, role }).then((r) => r.data),
  getDiff: (id: string) => api.get(`/sessions/${id}/diff`).then((r) => r.data),
  comment: (id: string, text: string) =>
    api.post(`/sessions/${id}/comments`, { text }).then((r) => r.data),
};

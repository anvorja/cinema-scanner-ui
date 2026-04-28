import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api/v1';

const api = axios.create({ baseURL: BASE_URL });

// Attach Bearer token on every request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('scanner_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Redirect to login on expired/invalid token
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem('scanner_token');
      sessionStorage.removeItem('scanner_user');
      window.location.replace('/login');
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data; // { access_token, token_type, user: { role, ... } }
}

// ── Ticket validation ─────────────────────────────────────────────────────────

export async function validateTicket(ticketCode) {
  try {
    const { data } = await api.post(`/purchases/tickets/${encodeURIComponent(ticketCode)}/validate`);
    return { ok: true, data };
  } catch (err) {
    const status = err.response?.status;
    const detail = err.response?.data?.detail || err.message || 'Error desconocido';
    return { ok: false, status, detail };
  }
}

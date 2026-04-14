import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090/api/v1';

const api = axios.create({ baseURL: BASE_URL });

// Attach Bearer token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('scanner_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  return data; // { access_token, token_type, user: { role, ... } }
}

// ── Ticket validation ─────────────────────────────────────────────────────────

/**
 * Validate a ticket by its ticket_code (e.g. CINE-ABC12345).
 * Calls POST /purchases/validate/{ticket_code} on booking-service.
 * Returns the validation result object from the backend.
 * Throws on network error; 4xx errors are returned as { error, status }.
 */
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

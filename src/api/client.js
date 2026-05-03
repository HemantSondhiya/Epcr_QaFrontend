import axios from 'axios';
import { logout } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

// Store reference — set via injectStore() called from main.jsx
let _store;
export const injectStore = (store) => { _store = store; };

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://epcr-qabackend.onrender.com',
  timeout: 15000,
});

// ── Request: attach Bearer token ────────────────────────────────────
client.interceptors.request.use((config) => {
  const token =
    _store?.getState()?.auth?.token ||
    localStorage.getItem('med_epcr_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Extract a human-readable error message from various Spring Boot error formats:
 *  - { message: "..." }
 *  - { error: "..." }
 *  - { errors: [ { defaultMessage: "..." }, ... ] }
 *  - { errors: { field: "msg", ... } }
 *  - { fieldErrors: { field: "msg" } }
 *  - plain string body
 */
export const extractErrorMessage = (err) => {
  const data = err.response?.data;
  if (!data) return err.message || 'An error occurred';
  if (typeof data === 'string') return data;
  if (data.message) return data.message;
  if (data.error && typeof data.error === 'string') return data.error;
  // Spring Boot validation: array of field errors
  if (Array.isArray(data.errors)) {
    return data.errors.map(e => e.defaultMessage || e.message || e.field).join(', ');
  }
  // Map of field -> error string
  if (data.errors && typeof data.errors === 'object') {
    return Object.entries(data.errors).map(([k, v]) => `${k}: ${v}`).join(', ');
  }
  if (data.fieldErrors && typeof data.fieldErrors === 'object') {
    return Object.entries(data.fieldErrors).map(([k, v]) => `${k}: ${v}`).join(', ');
  }
  return 'Validation failed. Please check your input.';
};

// ── Response: centralised error handling ────────────────────────────
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = extractErrorMessage(err);

    if (err.config?.hideToast) {
      if (status === 401) {
        _store?.dispatch(logout());
        window.location.replace('/login');
      }
      return Promise.reject(err);
    }

    if (status === 401) {
      _store?.dispatch(logout());
      window.location.replace('/login');
    } else if (status === 403) {
      _store?.dispatch(addToast({ type: 'error', message: 'Access Denied — you don\'t have permission.' }));
    } else if (status === 400) {
      _store?.dispatch(addToast({ type: 'error', message: `Validation Error: ${message}` }));
    } else if (status >= 500) {
      _store?.dispatch(addToast({ type: 'error', message: `Server Error: ${message}` }));
    } else if (!err.response) {
      _store?.dispatch(addToast({ type: 'error', message: 'Network error — check your connection.' }));
    }

    return Promise.reject(err);
  }
);

export default client;


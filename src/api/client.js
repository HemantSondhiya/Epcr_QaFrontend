import axios from 'axios';
import { logout } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

// Store reference — set via injectStore() called from main.jsx
let _store;
export const injectStore = (store) => { _store = store; };

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://epcr-qabackend.onrender.com',
  timeout: 15000,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
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

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
  refreshSubscribers.push(cb);
};

const onRefreshed = () => {
  refreshSubscribers.map((cb) => cb());
  refreshSubscribers = [];
};

// ── Response: centralised error handling ────────────────────────────
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = extractErrorMessage(err);
    const originalRequest = err.config;

    if (status === 401 && !originalRequest._retry) {
      // If already trying to login or refresh, don't retry, just logout
      if (originalRequest.url.includes('/api/auth/login') || originalRequest.url.includes('/api/auth/refresh')) {
        _store?.dispatch(logout());
        if (!originalRequest.url.includes('/api/auth/login') && window.location.pathname !== '/login') {
          window.location.replace('/login');
        }
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            resolve(client(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        client.post('/api/auth/refresh')
          .then(() => {
            isRefreshing = false;
            onRefreshed();
            resolve(client(originalRequest));
          })
          .catch((refreshErr) => {
            isRefreshing = false;
            refreshSubscribers = [];
            _store?.dispatch(logout());
            if (window.location.pathname !== '/login') {
              window.location.replace('/login');
            }
            reject(refreshErr);
          });
      });
    }

    if (err.config?.hideToast) {
      return Promise.reject(err);
    }

    if (status === 403) {
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


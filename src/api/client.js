import axios from 'axios';
import { loginSuccess, logout } from '../store/slices/authSlice';
import { addToast } from '../store/slices/uiSlice';

// Store reference — set via injectStore() called from main.jsx
let _store;
export const injectStore = (store) => { _store = store; };

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 20000,
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
});

// AI suggestion / Q&A endpoints can take 30-90 s (Gemini + attachments)
// Override timeout for those paths only.
client.interceptors.request.use((config) => {
  if (config.url && config.url.includes('/api/ai/suggestions')) {
    config.timeout = 120000; // 2 minutes
  }
  return config;
});

// Request interceptor for CSRF and other outgoing logic
client.interceptors.request.use(
  (config) => {
    config.headers = config.headers || {};

    // Add Bearer token only for internal API requests (to avoid sending it to Supabase/S3)
    const token = _store?.getState()?.auth?.user?.accessToken;
    const isInternal = config.url.startsWith('/') || config.url.startsWith(import.meta.env.VITE_API_BASE_URL);
    if (token && isInternal && token !== "undefined" && token !== "null") {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Ensure X-XSRF-TOKEN is set for non-GET requests if the cookie exists
    if (config.method && ['post', 'put', 'delete', 'patch'].includes(config.method.toLowerCase())) {
      const names = ['XSRF-TOKEN', 'CSRF-TOKEN', '_csrf'];
      let token = null;
      for (const name of names) {
        const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
        if (match) {
          token = decodeURIComponent(match[2]);
          break;
        }
      }
      if (token) {
        config.headers['X-XSRF-TOKEN'] = token;
        config.headers['X-CSRF-TOKEN'] = token;
      }
      // Often required by Spring Security to distinguish AJAX requests
      config.headers['X-Requested-With'] = 'XMLHttpRequest';

      // Ensure Content-Type is set for state-changing requests
      if (!config.headers['Content-Type'] && !(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

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

  // Prioritize specific field errors/sub-errors over a generic "Validation failed" message

  // 1. Array of errors (Spring standard)
  if (Array.isArray(data.errors)) {
    return data.errors.map(e => e.defaultMessage || e.message || e.field).join(', ');
  }

  // 2. Map of field -> error (in 'errors', 'fieldErrors', or 'data' property)
  const fieldErrors = data.errors || data.fieldErrors || (data.message === 'Validation failed' ? data.data : null);
  if (fieldErrors && typeof fieldErrors === 'object' && !Array.isArray(fieldErrors)) {
    const messages = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${v}`);
    if (messages.length > 0) return messages.join(', ');
  }

  // 3. Fallback to message or error property
  if (data.message && data.message !== 'Validation failed') return data.message;
  if (data.error && typeof data.error === 'string' && data.error !== 'Bad Request') return data.error;

  // 4. Handle generic 400 with potential raw data
  if (err.response?.status === 400) {
    if (data && typeof data === 'object' && Object.keys(data).length > 0 && !data.message && !data.error) {
       const details = Object.entries(data)
         .filter(([k]) => k !== 'timestamp' && k !== 'status' && k !== 'path')
         .map(([k, v]) => `${k}: ${v}`).join(', ');
       if (details) return `Validation failed: ${details}`;
    }
    return 'Invalid request parameters or malformed data.';
  }

  return data.message || data.error || 'Validation failed. Please check your input.';
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

    // skip refresh on these specific endpoints to avoid infinite loops
    const isAuthRequest = originalRequest.url.includes('/api/auth/login') ||
      originalRequest.url.includes('/api/auth/refresh') ||
      originalRequest.url.includes('/api/auth/logout') ||
      originalRequest.url.includes('/api/patient/auth/');

    // Only skip refresh for /api/auth/me if we don't have an access token yet
    const hasToken = !!_store?.getState()?.auth?.user?.accessToken;
    const isInitialSessionCheck = originalRequest.url.includes('/api/auth/me') && !hasToken;

    if (status === 401 && !originalRequest._retry && !isAuthRequest && !isInitialSessionCheck) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => {
            originalRequest._retry = true;
            resolve(client(originalRequest));
          });
        });
      }

      const isLoginPage = window.location.pathname === '/login';

      if (isLoginPage) {
        return Promise.reject(err);
      }

      originalRequest._retry = true;
      isRefreshing = true;

      return new Promise((resolve, reject) => {
        client.post('/api/auth/refresh', {}, { hideToast: true })
          .then((refreshRes) => {
            const data = refreshRes.data || {};
            const accessToken = data.accessToken || data.token;
            const refreshToken = data.refreshToken;
            const currentUser = _store?.getState()?.auth?.user || {};
            if (accessToken) {
              _store?.dispatch(loginSuccess({
                user: {
                  ...currentUser,
                  ...data,
                  id: data.userId || currentUser.id || currentUser.userId,
                  userId: data.userId || currentUser.userId || currentUser.id,
                  role: data.role || currentUser.role,
                  organizationId: data.organizationId || currentUser.organizationId,
                  accessToken,
                  refreshToken: refreshToken || currentUser.refreshToken,
                },
              }));
            }
            isRefreshing = false;
            onRefreshed();
            resolve(client(originalRequest));
          })
          .catch((refreshErr) => {
            isRefreshing = false;
            refreshSubscribers = [];
            _store?.dispatch(logout());
            if (window.location.pathname !== '/login') {
              window.location.href = '/login';
            }
            reject(refreshErr);
          });
      });
    }

    if (status === 401 && originalRequest.url.includes('/api/auth/refresh')) {
      _store?.dispatch(logout());
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    if (err.config?.hideToast) {
      return Promise.reject(err);
    }

    if (status === 403) {
      _store?.dispatch(addToast({ type: 'error', message: message || 'Access Denied — you don\'t have permission.' }));
    } else if (status === 404) {
      _store?.dispatch(addToast({ type: 'error', message: message || 'Resource not found.' }));
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

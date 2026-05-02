import axios from 'axios';
import { logout }      from '../store/slices/authSlice';
import { addToast }    from '../store/slices/uiSlice';

// Store reference — set via injectStore() called from main.jsx
let _store;
export const injectStore = (store) => { _store = store; };

const client = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:9091',
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

// ── Response: centralised error handling ────────────────────────────
client.interceptors.response.use(
  (res) => res,
  (err) => {
    const status  = err.response?.status;
    const message = err.response?.data?.message || err.message || 'An error occurred';

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
    } else if (status >= 500) {
      _store?.dispatch(addToast({ type: 'error', message: `Server Error: ${message}` }));
    } else if (!err.response) {
      _store?.dispatch(addToast({ type: 'error', message: 'Network error — check your connection.' }));
    }

    return Promise.reject(err);
  }
);

export default client;

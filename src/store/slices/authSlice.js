import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client from '../../api/client';

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { getState, rejectWithValue }) => {
  const currentRole = getState().auth.user?.role;
  const endpoints = currentRole === 'PATIENT'
    ? [{ url: '/api/patient/auth/me', role: 'PATIENT' }]
    : currentRole
      ? [{ url: '/api/auth/me', role: 'STAFF' }]
      : [
          { url: '/api/auth/me', role: 'STAFF' },
          { url: '/api/patient/auth/me', role: 'PATIENT' },
        ];

  for (const { url, role } of endpoints) {
    try {
      const res = await client.get(url, { hideToast: true });
      
      if (role === 'PATIENT') {
        return { ...res.data, role: 'PATIENT', isPatientLogin: true };
      }
      return res.data;
    } catch (error) {
      if (error.response?.status === 429) {
        return rejectWithValue('Too many authentication checks. Please wait a moment and try again.');
      }
      // Silently catch 400/401 and try the next endpoint in the array
      continue;
    }
  }

  // If both endpoints fail, the user is genuinely logged out
  return rejectWithValue(null);
}, {
  condition: (_, { getState }) => !getState().auth.isChecking,
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try {
    await Promise.allSettled([
      client.post('/api/auth/logout', {}, { hideToast: true }),
      client.post('/api/patient/auth/logout', {}, { hideToast: true }),
    ]);
  } catch (e) {
    // The backend might return 403 due to strict CSRF rules on the POST request.
    // We swallow the error here because the 'finally' block ensures the frontend 
    // clears the session and redirects to login regardless.
  } finally {
    dispatch(logout());
  }
});

// ── Persistence helpers (DISABLED for prod-ready security) ──────────────────────────
const saveUser = (user) => {
  // Do nothing to keep tokens out of localStorage
};
// ────────────────────────────────────────────────────────────────────

const initialState = {
  user: null,
  isAuthenticated: false,
  isInitializing: true,
  isChecking: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.user            = action.payload?.user || null;
      state.isAuthenticated = !!action.payload?.user;
      saveUser(state.user);
    },
    logout(state) {
      state.user            = null;
      state.isAuthenticated = false;
      state.isChecking      = false;
      saveUser(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isInitializing = true;
        state.isChecking = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        // CurrentUserResponse: { userId, firstName, lastName, email, organizationId, role }
        const data = action.payload;
        if (data) {
          state.user = {
            ...state.user,  // preserve tokens from login in memory
            userId: data.userId || data.patientId, // Map patientId to userId for generic components
            id: data.userId || data.patientId,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email || data.identifier, // patient might not have email
            organizationId: data.organizationId,
            role: data.role,
            patientId: data.patientId, // Explicitly save patientId
            accessToken: data.accessToken || data.token || state.user?.accessToken,
            refreshToken: data.refreshToken || state.user?.refreshToken,
          };
        } else {
          state.user = null;
        }
        state.isAuthenticated = !!data;
        state.isInitializing = false;
        state.isChecking = false;
        saveUser(state.user);
      })
      .addCase(checkAuth.rejected, (state) => {
        // Server says not authenticated — clear stored data
        state.user = null;
        state.isAuthenticated = false;
        state.isInitializing = false;
        state.isChecking = false;
        saveUser(null);
      });
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export const selectAuth  = (s) => s.auth;
export const selectUser  = (s) => s.auth.user;
export const selectRole  = (s) => s.auth.user?.role;
export const selectIsAuthenticated = (s) => s.auth.isAuthenticated;
export const selectIsInitializing = (s) => s.auth.isInitializing;

export default authSlice.reducer;

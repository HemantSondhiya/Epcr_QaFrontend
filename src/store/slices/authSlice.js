import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client from '../../api/client';

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  const endpoints = [
    { url: '/api/auth/me', role: 'STAFF' },
    { url: '/api/patient/auth/me', role: 'PATIENT' }
  ];

  for (const { url, role } of endpoints) {
    try {
      const res = await client.get(url, { hideToast: true });
      
      if (role === 'PATIENT') {
        return { ...res.data, role: 'PATIENT', isPatientLogin: true };
      }
      return res.data;
    } catch (error) {
      // Silently catch 400/401 and try the next endpoint in the array
      continue;
    }
  }

  // If both endpoints fail, the user is genuinely logged out
  return rejectWithValue(null);
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
      saveUser(null);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isInitializing = true;
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
            patientId: data.patientId // Explicitly save patientId
          };
        } else {
          state.user = null;
        }
        state.isAuthenticated = !!data;
        state.isInitializing = false;
        saveUser(state.user);
      })
      .addCase(checkAuth.rejected, (state) => {
        // Server says not authenticated — clear stored data
        state.user = null;
        state.isAuthenticated = false;
        state.isInitializing = false;
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

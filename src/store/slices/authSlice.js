import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client from '../../api/client';

export const checkAuth = createAsyncThunk('auth/checkAuth', async (_, { rejectWithValue }) => {
  try {
    const response = await client.get('/api/auth/me', { hideToast: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data);
  }
});

export const logoutUser = createAsyncThunk('auth/logout', async (_, { dispatch }) => {
  try {
    await client.post('/api/auth/logout');
  } catch (e) {
    console.error('Logout request failed', e);
  } finally {
    dispatch(logout());
  }
});

const initialState = {
  user: null,
  isAuthenticated: false,
  isInitializing: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, { payload: { user } }) {
      state.user            = user;
      state.isAuthenticated = true;
    },
    logout(state) {
      state.user            = null;
      state.isAuthenticated = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkAuth.pending, (state) => {
        state.isInitializing = true;
      })
      .addCase(checkAuth.fulfilled, (state, { payload }) => {
        state.user = payload;
        state.isAuthenticated = true;
        state.isInitializing = false;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.isInitializing = false;
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

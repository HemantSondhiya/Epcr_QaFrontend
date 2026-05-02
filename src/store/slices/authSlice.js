import { createSlice } from '@reduxjs/toolkit';

const TOKEN_KEY = 'med_epcr_token';
const USER_KEY  = 'med_epcr_user';

const loadAuth = () => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const user  = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    return { token, user, isAuthenticated: !!token };
  } catch {
    return { token: null, user: null, isAuthenticated: false };
  }
};

const authSlice = createSlice({
  name: 'auth',
  initialState: loadAuth(),
  reducers: {
    loginSuccess(state, { payload: { token, user } }) {
      state.token           = token;
      state.user            = user;
      state.isAuthenticated = true;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    logout(state) {
      state.token           = null;
      state.user            = null;
      state.isAuthenticated = false;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
  },
});

export const { loginSuccess, logout } = authSlice.actions;
export const selectAuth  = (s) => s.auth;
export const selectUser  = (s) => s.auth.user;
export const selectRole  = (s) => s.auth.user?.role;
export const selectToken = (s) => s.auth.token;
export const selectIsAuthenticated = (s) => s.auth.isAuthenticated;

export default authSlice.reducer;

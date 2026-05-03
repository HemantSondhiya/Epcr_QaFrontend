import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client from '../../api/client';

const extractContent = (data) => {
  if (Array.isArray(data)) return data;
  if (data?.content && Array.isArray(data.content)) return data.content;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.notifications && Array.isArray(data.notifications)) return data.notifications;
  if (data?.results && Array.isArray(data.results)) return data.results;
  return [];
};

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (page = 0, { rejectWithValue }) => {
    try {
      const res = await client.get('/api/notifications/me', {
        params: { page, size: 20 },
        hideToast: true
      });
      return res.data;
    }
    catch (e) { 
      return rejectWithValue(e.response?.data?.message || 'Failed to load notifications'); 
    }
  }
);

export const fetchUnreadNotifications = createAsyncThunk(
  'notifications/fetchUnread',
  async (page = 0, { rejectWithValue }) => {
    try {
      const res = await client.get('/api/notifications/me/unread', {
        params: { page, size: 20 },
        hideToast: true
      });
      return res.data;
    }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to load unread notifications'); }
  }
);

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try { return (await client.put(`/api/notifications/${id}/mark-as-read`)).data; }
    catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed'); }
  }
);

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try { await client.put('/api/notifications/me/mark-all-as-read'); return true; }
    catch (e) { return rejectWithValue('Failed'); }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    items: [],
    unreadItems: [],
    loading: false,
    error: null,
    currentPage: 0,
    totalPages: 0,
    totalElements: 0,
    pageSize: 20,
  },
  reducers: {
    resetPagination: (s) => {
      s.currentPage = 0;
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchNotifications.pending, (s) => { s.loading = true; })
     .addCase(fetchNotifications.fulfilled, (s, a) => {
       s.loading = false;
       s.error = null;
       const content = extractContent(a.payload);
       s.items = content;
       s.unreadItems = content.filter(n => !n.read);
       // Map API pagination fields correctly
       s.currentPage = a.payload?.page ?? 0;
       s.totalPages = a.payload?.totalPages ?? 0;
       s.totalElements = a.payload?.totalElements ?? 0;
     })
     .addCase(fetchNotifications.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(fetchUnreadNotifications.pending, (s) => { s.loading = true; })
     .addCase(fetchUnreadNotifications.fulfilled, (s, a) => {
       s.loading = false;
       const content = extractContent(a.payload);
       s.unreadItems = content;
     })
     .addCase(fetchUnreadNotifications.rejected, (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(markNotificationRead.fulfilled, (s, a) => {
       const id = a.payload?.id || a.meta.arg;
       const idx = s.items.findIndex(n => n.id === id);
       if (idx !== -1) s.items[idx] = { ...s.items[idx], read: true };
       s.unreadItems = s.unreadItems.filter(n => n.id !== id);
     })
     .addCase(markAllRead.fulfilled, (s) => {
       s.items = s.items.map(n => ({ ...n, read: true }));
       s.unreadItems = [];
     });
  },
});

export const { resetPagination } = notificationSlice.actions;
export const selectNotifications = (s) => s.notifications.items;
export const selectUnreadCount = (s) => s.notifications.unreadItems.length;
export const selectNotifLoading = (s) => s.notifications.loading;
export const selectNotifError = (s) => s.notifications.error;
export const selectNotifPagination = (s) => ({
  currentPage: s.notifications.currentPage,
  totalPages: s.notifications.totalPages,
  totalElements: s.notifications.totalElements,
});
export default notificationSlice.reducer;

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import client from '../../api/client';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (recipientId, { rejectWithValue }) => {
    try {
      const url = recipientId
        ? `/api/notifications/recipient/${recipientId}`
        : '/api/notifications';
      return (await client.get(url, { hideToast: true })).data;
    } catch (e) { return rejectWithValue(e.response?.data?.message || 'Failed to load notifications'); }
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
  async (recipientId, { rejectWithValue }) => {
    try {
      await client.put(`/api/notifications/recipient/${recipientId}/mark-all-as-read`);
      return recipientId;
    } catch (e) { return rejectWithValue('Failed'); }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], loading: false, error: null },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchNotifications.pending,   (s) => { s.loading = true; })
     .addCase(fetchNotifications.fulfilled, (s, a) => { s.loading = false; s.items = a.payload; })
     .addCase(fetchNotifications.rejected,  (s, a) => { s.loading = false; s.error = a.payload; })
     .addCase(markNotificationRead.fulfilled, (s, a) => {
       const idx = s.items.findIndex(n => n.id === a.payload.id);
       if (idx !== -1) s.items[idx] = { ...s.items[idx], read: true };
     })
     .addCase(markAllRead.fulfilled, (s) => {
       s.items = s.items.map(n => ({ ...n, read: true }));
     });
  },
});

export const selectNotifications = (s) => s.notifications.items;
export const selectUnreadCount   = (s) => s.notifications.items.filter(n => !n.read).length;
export const selectNotifLoading  = (s) => s.notifications.loading;
export default notificationSlice.reducer;

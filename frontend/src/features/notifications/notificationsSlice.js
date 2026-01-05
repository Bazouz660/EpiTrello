import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { httpClient } from '../../services/httpClient.js';
import { clearSession } from '../auth/authSlice.js';

const extractErrorMessage = (error) => {
  const fallback = 'Unable to complete the request';
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  return error.message ?? fallback;
};

const buildInitialState = () => ({
  items: [],
  unreadCount: 0,
  total: 0,
  status: 'idle',
  error: null,
  markReadStatus: 'idle',
  markReadError: null,
});

const initialState = buildInitialState();

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/notifications', {
        params,
      });
      return data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const fetchUnreadCount = createAsyncThunk(
  'notifications/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/notifications/unread-count');
      return data.unreadCount;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.patch(`/notifications/${id}/read`);
      return data.notification;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const markAllAsRead = createAsyncThunk(
  'notifications/markAllAsRead',
  async (_, { rejectWithValue }) => {
    try {
      await httpClient.post('/notifications/mark-all-read');
      return true;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id, { rejectWithValue }) => {
    try {
      await httpClient.delete(`/notifications/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    clearNotificationsState: () => buildInitialState(),
    addNotification: (state, action) => {
      state.items.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
      state.total += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload.notifications;
        state.total = action.payload.total;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload;
      })
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      })
      .addCase(markAsRead.pending, (state) => {
        state.markReadStatus = 'loading';
        state.markReadError = null;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        state.markReadStatus = 'succeeded';
        const notification = state.items.find((n) => n.id === action.payload.id);
        if (notification && !notification.read) {
          notification.read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.markReadStatus = 'failed';
        state.markReadError = action.payload;
        state.error = action.payload;
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.items.forEach((n) => {
          n.read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const index = state.items.findIndex((n) => n.id === action.payload);
        if (index !== -1) {
          const notification = state.items[index];
          if (!notification.read) {
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
          state.items.splice(index, 1);
          state.total = Math.max(0, state.total - 1);
        }
      })
      .addCase(clearSession, () => buildInitialState());
  },
});

export const { clearNotificationsState, addNotification } = notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;
export const selectNotifications = (state) => state.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationsStatus = (state) => state.notifications.status;
export const createNotificationsInitialState = (overrides = {}) => ({
  ...buildInitialState(),
  ...overrides,
});

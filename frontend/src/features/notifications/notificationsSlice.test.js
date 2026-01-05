import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

const httpClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../services/httpClient.js', () => ({
  httpClient: httpClientMock,
}));

vi.mock('../auth/authSlice.js', () => ({
  clearSession: { type: 'auth/clearSession' },
}));

const resetHttpClient = () => {
  httpClientMock.get.mockReset();
  httpClientMock.post.mockReset();
  httpClientMock.patch.mockReset();
  httpClientMock.delete.mockReset();
};

const importNotificationsSlice = async () => {
  vi.resetModules();
  resetHttpClient();
  return import('./notificationsSlice.js');
};

describe('notificationsSlice', () => {
  describe('fetchNotifications', () => {
    it('fetches notifications successfully', async () => {
      const { notificationsReducer, fetchNotifications, selectNotifications } =
        await importNotificationsSlice();

      const mockNotifications = [
        {
          id: 'notif-1',
          type: 'card_assigned',
          title: 'Assigned to card: Task 1',
          message: 'You have been assigned',
          read: false,
          createdAt: '2024-01-15T10:00:00.000Z',
        },
        {
          id: 'notif-2',
          type: 'comment',
          title: 'New comment on: Task 2',
          message: 'User commented on a card',
          read: true,
          createdAt: '2024-01-14T10:00:00.000Z',
        },
      ];

      httpClientMock.get.mockResolvedValue({
        data: { notifications: mockNotifications, total: 2 },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
      });

      await store.dispatch(fetchNotifications());

      const state = selectNotifications(store.getState());
      expect(state.status).toBe('succeeded');
      expect(state.items).toEqual(mockNotifications);
      expect(state.total).toBe(2);
      expect(state.error).toBeNull();
    });

    it('records an error when fetching notifications fails', async () => {
      const { notificationsReducer, fetchNotifications, selectNotifications } =
        await importNotificationsSlice();

      httpClientMock.get.mockRejectedValue({
        response: { data: { message: 'Unauthorized' } },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
      });

      await store.dispatch(fetchNotifications());

      const state = selectNotifications(store.getState());
      expect(state.status).toBe('failed');
      expect(state.error).toBe('Unauthorized');
      expect(state.items).toEqual([]);
    });

    it('supports pagination parameters', async () => {
      const { notificationsReducer, fetchNotifications } = await importNotificationsSlice();

      httpClientMock.get.mockResolvedValue({
        data: { notifications: [], total: 0 },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
      });

      await store.dispatch(fetchNotifications({ page: 2, limit: 5 }));

      expect(httpClientMock.get).toHaveBeenCalledWith('/notifications', {
        params: { page: 2, limit: 5 },
      });
    });

    it('supports unreadOnly filter', async () => {
      const { notificationsReducer, fetchNotifications } = await importNotificationsSlice();

      httpClientMock.get.mockResolvedValue({
        data: { notifications: [], total: 0 },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
      });

      await store.dispatch(fetchNotifications({ unreadOnly: true }));

      expect(httpClientMock.get).toHaveBeenCalledWith('/notifications', {
        params: { unreadOnly: true },
      });
    });
  });

  describe('fetchUnreadCount', () => {
    it('fetches unread count successfully', async () => {
      const { notificationsReducer, fetchUnreadCount, selectNotifications } =
        await importNotificationsSlice();

      httpClientMock.get.mockResolvedValue({
        data: { unreadCount: 5 },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
      });

      await store.dispatch(fetchUnreadCount());

      const state = selectNotifications(store.getState());
      expect(state.unreadCount).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      const {
        notificationsReducer,
        markAsRead,
        selectNotifications,
        createNotificationsInitialState,
      } = await importNotificationsSlice();

      const initialState = createNotificationsInitialState({
        items: [
          { id: 'notif-1', read: false, title: 'Test' },
          { id: 'notif-2', read: false, title: 'Test 2' },
        ],
        unreadCount: 2,
      });

      httpClientMock.patch.mockResolvedValue({
        data: { notification: { id: 'notif-1', read: true, title: 'Test' } },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
        preloadedState: { notifications: initialState },
      });

      await store.dispatch(markAsRead('notif-1'));

      const state = selectNotifications(store.getState());
      const updatedNotif = state.items.find((n) => n.id === 'notif-1');
      expect(updatedNotif.read).toBe(true);
      expect(state.unreadCount).toBe(1);
    });

    it('handles errors when marking as read fails', async () => {
      const { notificationsReducer, markAsRead, selectNotifications } =
        await importNotificationsSlice();

      httpClientMock.patch.mockRejectedValue({
        response: { data: { message: 'Not found' } },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
      });

      await store.dispatch(markAsRead('invalid-id'));

      const state = selectNotifications(store.getState());
      expect(state.error).toBe('Not found');
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      const {
        notificationsReducer,
        markAllAsRead,
        selectNotifications,
        createNotificationsInitialState,
      } = await importNotificationsSlice();

      const initialState = createNotificationsInitialState({
        items: [
          { id: 'notif-1', read: false, title: 'Test 1' },
          { id: 'notif-2', read: false, title: 'Test 2' },
          { id: 'notif-3', read: true, title: 'Test 3' },
        ],
        unreadCount: 2,
      });

      httpClientMock.post.mockResolvedValue({
        data: { message: 'All notifications marked as read' },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
        preloadedState: { notifications: initialState },
      });

      await store.dispatch(markAllAsRead());

      const state = selectNotifications(store.getState());
      expect(state.items.every((n) => n.read === true)).toBe(true);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('deleteNotification', () => {
    it('deletes notification from list', async () => {
      const {
        notificationsReducer,
        deleteNotification,
        selectNotifications,
        createNotificationsInitialState,
      } = await importNotificationsSlice();

      const initialState = createNotificationsInitialState({
        items: [
          { id: 'notif-1', read: false, title: 'Test 1' },
          { id: 'notif-2', read: true, title: 'Test 2' },
        ],
        total: 2,
        unreadCount: 1,
      });

      httpClientMock.delete.mockResolvedValue({
        data: { message: 'Notification deleted' },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
        preloadedState: { notifications: initialState },
      });

      await store.dispatch(deleteNotification('notif-1'));

      const state = selectNotifications(store.getState());
      expect(state.items).toHaveLength(1);
      expect(state.items[0].id).toBe('notif-2');
      expect(state.total).toBe(1);
      expect(state.unreadCount).toBe(0);
    });

    it('does not decrement unread count for read notifications', async () => {
      const {
        notificationsReducer,
        deleteNotification,
        selectNotifications,
        createNotificationsInitialState,
      } = await importNotificationsSlice();

      const initialState = createNotificationsInitialState({
        items: [
          { id: 'notif-1', read: false, title: 'Test 1' },
          { id: 'notif-2', read: true, title: 'Test 2' },
        ],
        total: 2,
        unreadCount: 1,
      });

      httpClientMock.delete.mockResolvedValue({
        data: { message: 'Notification deleted' },
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
        preloadedState: { notifications: initialState },
      });

      await store.dispatch(deleteNotification('notif-2'));

      const state = selectNotifications(store.getState());
      expect(state.items).toHaveLength(1);
      expect(state.unreadCount).toBe(1); // Should not change
    });
  });

  describe('selectors', () => {
    it('selectUnreadCount returns correct count', async () => {
      const { notificationsReducer, selectUnreadCount, createNotificationsInitialState } =
        await importNotificationsSlice();

      const initialState = createNotificationsInitialState({
        unreadCount: 7,
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
        preloadedState: { notifications: initialState },
      });

      expect(selectUnreadCount(store.getState())).toBe(7);
    });

    it('selectNotificationsStatus returns correct status', async () => {
      const { notificationsReducer, selectNotificationsStatus, createNotificationsInitialState } =
        await importNotificationsSlice();

      const initialState = createNotificationsInitialState({
        status: 'loading',
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
        preloadedState: { notifications: initialState },
      });

      expect(selectNotificationsStatus(store.getState())).toBe('loading');
    });
  });

  describe('clearSession', () => {
    it('resets state when clearSession is dispatched', async () => {
      const { notificationsReducer, selectNotifications, createNotificationsInitialState } =
        await importNotificationsSlice();

      const initialState = createNotificationsInitialState({
        items: [{ id: 'notif-1', read: false, title: 'Test' }],
        unreadCount: 1,
        status: 'succeeded',
      });

      const store = configureStore({
        reducer: { notifications: notificationsReducer },
        preloadedState: { notifications: initialState },
      });

      store.dispatch({ type: 'auth/clearSession' });

      const state = selectNotifications(store.getState());
      expect(state.items).toEqual([]);
      expect(state.unreadCount).toBe(0);
      expect(state.status).toBe('idle');
    });
  });
});

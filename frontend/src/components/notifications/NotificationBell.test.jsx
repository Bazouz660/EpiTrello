import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import NotificationBell from './NotificationBell.jsx';

// Mock the socket service
vi.mock('../../services/socketService.js', () => ({
  connectSocket: vi.fn().mockResolvedValue(undefined),
  subscribe: vi.fn().mockReturnValue(() => {}),
}));

// Mock navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Create a mock store
const createMockStore = (initialState = {}) => {
  const defaultState = {
    auth: {
      token: 'test-token',
      user: { id: 'user-1', username: 'testuser' },
    },
    notifications: {
      items: [],
      unreadCount: 0,
      status: 'idle',
      error: null,
    },
    ...initialState,
  };

  return {
    getState: () => defaultState,
    subscribe: vi.fn(() => () => {}),
    dispatch: vi.fn((action) => {
      if (typeof action === 'function') {
        return action();
      }
      return action;
    }),
  };
};

const renderWithProviders = (store = createMockStore()) => {
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    </Provider>,
  );
};

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the notification bell button', () => {
    renderWithProviders();
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('shows unread count badge when there are unread notifications', () => {
    const store = createMockStore({
      notifications: {
        items: [],
        unreadCount: 5,
        status: 'idle',
        error: null,
      },
    });
    renderWithProviders(store);
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /5 unread/i })).toBeInTheDocument();
  });

  it('shows 9+ when unread count exceeds 9', () => {
    const store = createMockStore({
      notifications: {
        items: [],
        unreadCount: 15,
        status: 'idle',
        error: null,
      },
    });
    renderWithProviders(store);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('opens dropdown when bell is clicked', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows empty state when there are no notifications', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('No notifications yet')).toBeInTheDocument();
  });

  it('shows loading state when fetching notifications', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      notifications: {
        items: [],
        unreadCount: 0,
        status: 'loading',
        error: null,
      },
    });
    renderWithProviders(store);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders notification items', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      notifications: {
        items: [
          {
            id: 'notif-1',
            type: 'card_assigned',
            title: 'Card Assigned',
            message: 'You were assigned to a card',
            read: false,
            createdAt: new Date().toISOString(),
            board: 'board-1',
            card: 'card-1',
          },
          {
            id: 'notif-2',
            type: 'mention',
            title: 'Mentioned',
            message: 'You were mentioned in a comment',
            read: true,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            board: 'board-1',
          },
          {
            id: 'notif-3',
            type: 'comment',
            title: 'New Comment',
            message: 'Someone commented on your card',
            read: false,
            createdAt: new Date(Date.now() - 86400000).toISOString(),
          },
        ],
        unreadCount: 2,
        status: 'succeeded',
        error: null,
      },
    });
    renderWithProviders(store);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Card Assigned')).toBeInTheDocument();
    expect(screen.getByText('Mentioned')).toBeInTheDocument();
    expect(screen.getByText('New Comment')).toBeInTheDocument();
    expect(screen.getByText('View all notifications')).toBeInTheDocument();
  });

  it('shows mark all as read button when there are unread notifications', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      notifications: {
        items: [
          {
            id: 'notif-1',
            type: 'card_assigned',
            title: 'Card Assigned',
            message: 'You were assigned',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        status: 'succeeded',
        error: null,
      },
    });
    renderWithProviders(store);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Mark all as read')).toBeInTheDocument();
  });

  it('dispatches markAllAsRead when mark all button is clicked', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      notifications: {
        items: [
          {
            id: 'notif-1',
            type: 'card_assigned',
            title: 'Card Assigned',
            message: 'You were assigned',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        status: 'succeeded',
        error: null,
      },
    });
    renderWithProviders(store);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    await user.click(screen.getByText('Mark all as read'));

    expect(store.dispatch).toHaveBeenCalled();
  });

  it('navigates to board when notification with board and card is clicked', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      notifications: {
        items: [
          {
            id: 'notif-1',
            type: 'card_assigned',
            title: 'Card Assigned',
            message: 'You were assigned',
            read: false,
            createdAt: new Date().toISOString(),
            board: 'board-123',
            card: 'card-456',
          },
        ],
        unreadCount: 1,
        status: 'succeeded',
        error: null,
      },
    });
    renderWithProviders(store);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    await user.click(screen.getByText('Card Assigned'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/boards/board-123?card=card-456');
    });
  });

  it('navigates to board when notification with only board is clicked', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      notifications: {
        items: [
          {
            id: 'notif-1',
            type: 'mention',
            title: 'Mentioned',
            message: 'You were mentioned',
            read: true,
            createdAt: new Date().toISOString(),
            board: 'board-789',
          },
        ],
        unreadCount: 0,
        status: 'succeeded',
        error: null,
      },
    });
    renderWithProviders(store);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    await user.click(screen.getByText('Mentioned'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/boards/board-789');
    });
  });

  it('navigates to notifications page when view all is clicked', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      notifications: {
        items: [
          {
            id: 'notif-1',
            type: 'comment',
            title: 'Comment',
            message: 'New comment',
            read: true,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 0,
        status: 'succeeded',
        error: null,
      },
    });
    renderWithProviders(store);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    await user.click(screen.getByText('View all notifications'));

    expect(mockNavigate).toHaveBeenCalledWith('/notifications');
  });

  it('closes dropdown when clicking outside', async () => {
    const user = userEvent.setup();
    renderWithProviders();

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('Notifications')).toBeInTheDocument();

    // Click outside
    await user.click(document.body);

    await waitFor(() => {
      expect(screen.queryByText('No notifications yet')).not.toBeInTheDocument();
    });
  });

  it('formats time correctly for recent notifications', async () => {
    const user = userEvent.setup();
    const store = createMockStore({
      notifications: {
        items: [
          {
            id: 'notif-1',
            type: 'card_assigned',
            title: 'Just Now',
            message: 'Recent notification',
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
        unreadCount: 1,
        status: 'succeeded',
        error: null,
      },
    });
    renderWithProviders(store);

    await user.click(screen.getByRole('button', { name: /notifications/i }));
    expect(screen.getByText('just now')).toBeInTheDocument();
  });
});

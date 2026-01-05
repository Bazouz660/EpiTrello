import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { selectAuth } from '../../features/auth/authSlice.js';
import {
  addNotification,
  fetchNotifications,
  fetchUnreadCount,
  markAsRead,
  markAllAsRead,
  selectNotifications,
} from '../../features/notifications/notificationsSlice.js';
import { useAppDispatch, useAppSelector } from '../../hooks/index.js';
import { subscribe } from '../../services/socketService.js';

const BellIcon = () => (
  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
    />
  </svg>
);

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'card_assigned':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </div>
      );
    case 'mention':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"
            />
          </svg>
        </div>
      );
    case 'comment':
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
          <BellIcon />
        </div>
      );
  }
};

// Play notification sound from audio file
const playNotificationSound = () => {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.5;
    audio.play().catch((error) => {
      console.debug('[NotificationBell] Could not play notification sound:', error);
    });
  } catch (error) {
    console.debug('[NotificationBell] Could not create audio element:', error);
  }
};

const NotificationBell = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: notifications, unreadCount, status } = useAppSelector(selectNotifications);
  const { token } = useAppSelector(selectAuth);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Connect to socket and subscribe to real-time notifications
  useEffect(() => {
    if (!token) return;

    let unsubscribe = null;

    const setupSocket = async () => {
      try {
        console.debug('[NotificationBell] Socket connected, subscribing to notifications');
        unsubscribe = subscribe('notification:new', (data) => {
          console.debug('[NotificationBell] Received notification:', data);
          if (data.notification) {
            dispatch(addNotification(data.notification));
            playNotificationSound();
          }
        });
      } catch (error) {
        console.error('[NotificationBell] Socket connection failed:', error);
      }
    };

    setupSocket();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [token, dispatch]);

  useEffect(() => {
    dispatch(fetchUnreadCount());
    const interval = setInterval(() => {
      dispatch(fetchUnreadCount());
    }, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchNotifications({ limit: 10 }));
    }
  }, [dispatch, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const handleNotificationClick = useCallback(
    async (notification) => {
      if (!notification.read) {
        dispatch(markAsRead(notification.id));
      }

      if (notification.board && notification.card) {
        navigate(`/boards/${notification.board}?card=${notification.card}`);
      } else if (notification.board) {
        navigate(`/boards/${notification.board}`);
      }

      setIsOpen(false);
    },
    [dispatch, navigate],
  );

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={handleToggle}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 w-80 origin-top-right rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {status === 'loading' && notifications.length === 0 && (
              <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
            )}

            {status !== 'loading' && notifications.length === 0 && (
              <div className="p-8 text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                  <BellIcon />
                </div>
                <p className="text-sm text-slate-500">No notifications yet</p>
              </div>
            )}

            {notifications.map((notification) => (
              <button
                key={notification.id}
                type="button"
                onClick={() => handleNotificationClick(notification)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                {getNotificationIcon(notification.type)}
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm ${!notification.read ? 'font-semibold' : ''} text-slate-900`}
                  >
                    {notification.title}
                  </p>
                  <p className="truncate text-xs text-slate-500">{notification.message}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatTimeAgo(notification.createdAt)}
                  </p>
                </div>
                {!notification.read && (
                  <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                )}
              </button>
            ))}
          </div>

          {notifications.length > 0 && (
            <div className="border-t px-4 py-2">
              <button
                type="button"
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

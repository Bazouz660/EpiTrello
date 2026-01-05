import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  deleteNotification,
  fetchNotifications,
  markAllAsRead,
  markAsRead,
  selectNotifications,
} from '../features/notifications/notificationsSlice.js';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';

const formatTimeAgo = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString();
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'card_assigned':
      return (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <svg
            className="h-5 w-5"
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <svg
            className="h-5 w-5"
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg
            className="h-5 w-5"
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        </div>
      );
  }
};

const NotificationsPage = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items: notifications, unreadCount, status, error } = useAppSelector(selectNotifications);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    dispatch(fetchNotifications({ limit: 50, unreadOnly: filter === 'unread' }));
  }, [dispatch, filter]);

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
    },
    [dispatch, navigate],
  );

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);

  const handleDelete = useCallback(
    (e, id) => {
      e.stopPropagation();
      dispatch(deleteNotification(id));
    },
    [dispatch],
  );

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Mark all as read
          </button>
        )}
      </header>

      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === 'unread'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Unread
        </button>
      </div>

      {status === 'loading' && notifications.length === 0 && (
        <div className="py-12 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-4 text-sm text-slate-500">Loading notifications...</p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-center text-sm text-red-600">{error}</div>
      )}

      {status !== 'loading' && notifications.length === 0 && (
        <div className="py-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <svg
              className="h-8 w-8 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900">No notifications</h3>
          <p className="mt-1 text-sm text-slate-500">
            {filter === 'unread'
              ? 'You have read all your notifications.'
              : "You don't have any notifications yet."}
          </p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notification) => (
          <button
            key={notification.id}
            type="button"
            onClick={() => handleNotificationClick(notification)}
            className={`flex w-full items-start gap-4 rounded-lg border p-4 text-left transition hover:shadow-md ${
              !notification.read
                ? 'border-blue-200 bg-blue-50 hover:bg-blue-100'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            {getNotificationIcon(notification.type)}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-sm ${!notification.read ? 'font-semibold' : ''} text-slate-900`}
                >
                  {notification.title}
                </p>
                <span className="flex-shrink-0 text-xs text-slate-400">
                  {formatTimeAgo(notification.createdAt)}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
              {notification.actor && (
                <p className="mt-2 text-xs text-slate-400">
                  by {notification.actor.username || 'Unknown user'}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={(e) => handleDelete(e, notification.id)}
              className="flex-shrink-0 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
              aria-label="Delete notification"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </button>
        ))}
      </div>
    </div>
  );
};

export default NotificationsPage;

import PropTypes from 'prop-types';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';

import { selectAuth } from '../features/auth/authSlice.js';
import { fetchBoards, selectBoards } from '../features/boards/boardsSlice.js';
import {
  fetchMyCards,
  fetchOverdueCards,
  fetchDueSoonCards,
  selectDashboard,
} from '../features/dashboard/dashboardSlice.js';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';

const DEFAULT_BACKGROUND_COLOR = '#0f172a';

const formatDueDate = (dueDate) => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const getBackgroundPreviewStyle = (background) => {
  if (!background) return { backgroundColor: DEFAULT_BACKGROUND_COLOR };
  if (background.type === 'image') {
    return {
      backgroundImage: `url(${background.thumbnail || background.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: background.value || DEFAULT_BACKGROUND_COLOR };
};

const CardItem = ({ card, showBoard = true }) => (
  <Link
    to={`/boards/${card.boardId}`}
    className="block rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:shadow-sm"
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-900">{card.title}</p>
        {showBoard && (
          <p className="mt-0.5 truncate text-xs text-slate-500">
            {card.boardTitle} → {card.listTitle}
          </p>
        )}
      </div>
      {card.dueDate && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
            new Date(card.dueDate) < new Date()
              ? 'bg-red-100 text-red-700'
              : 'bg-amber-100 text-amber-700'
          }`}
        >
          {formatDueDate(card.dueDate)}
        </span>
      )}
    </div>
    {card.labels?.length > 0 && (
      <div className="mt-2 flex flex-wrap gap-1">
        {card.labels.slice(0, 3).map((label, idx) => (
          <span
            key={idx}
            className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
            style={{ backgroundColor: label.color }}
          >
            {label.text || ''}
          </span>
        ))}
        {card.labels.length > 3 && (
          <span className="text-[10px] text-slate-400">+{card.labels.length - 3}</span>
        )}
      </div>
    )}
  </Link>
);

CardItem.propTypes = {
  card: PropTypes.shape({
    boardId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    boardTitle: PropTypes.string,
    listTitle: PropTypes.string,
    dueDate: PropTypes.string,
    labels: PropTypes.arrayOf(
      PropTypes.shape({
        color: PropTypes.string,
        text: PropTypes.string,
      }),
    ),
  }).isRequired,
  showBoard: PropTypes.bool,
};

const BoardCard = ({ board, isOwner }) => (
  <Link
    to={`/boards/${board.id}`}
    className="group block overflow-hidden rounded-xl border border-slate-200 shadow-sm transition hover:shadow-md"
  >
    <div className="h-24 p-3" style={getBackgroundPreviewStyle(board.background)}>
      <div className="flex h-full flex-col justify-end">
        <h3 className="truncate text-sm font-semibold text-white drop-shadow-sm">{board.title}</h3>
      </div>
    </div>
    <div className="bg-white px-3 py-2">
      <span
        className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
          isOwner ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
        }`}
      >
        {isOwner ? 'Owned' : 'Shared'}
      </span>
    </div>
  </Link>
);

BoardCard.propTypes = {
  board: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    background: PropTypes.shape({
      type: PropTypes.oneOf(['color', 'image']),
      value: PropTypes.string,
      thumbnail: PropTypes.string,
    }),
  }).isRequired,
  isOwner: PropTypes.bool,
};

const HomePage = () => {
  const dispatch = useAppDispatch();
  const { user, initialized } = useAppSelector(selectAuth);
  const { items: boards, status: boardsStatus } = useAppSelector(selectBoards);
  const { myCards, overdueCards, dueSoonCards } = useAppSelector(selectDashboard);

  useEffect(() => {
    if (user && initialized) {
      dispatch(fetchBoards());
      dispatch(fetchMyCards({ limit: 6 }));
      dispatch(fetchOverdueCards({ limit: 5 }));
      dispatch(fetchDueSoonCards({ limit: 5 }));
    }
  }, [dispatch, user, initialized]);

  // Non-logged-in view
  if (!user) {
    return (
      <section className="mx-auto max-w-6xl space-y-8">
        {/* Hero Section */}
        <header className="space-y-4 py-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 sm:text-5xl">
            Organize your projects with <span className="text-blue-600">EpiTrello</span>
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Collaborate with your team, track progress in real time, and deliver projects faster
            with our intuitive Kanban-style boards.
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            {initialized && (
              <>
                <Link
                  to="/register"
                  className="bg-primary text-primary-foreground inline-flex items-center rounded-lg px-6 py-3 text-base font-medium shadow-lg transition hover:bg-blue-600"
                >
                  Get Started Free
                  <svg
                    className="ml-2 h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  Sign in
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-blue-100 p-3">
              <svg
                className="h-6 w-6 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Kanban Boards</h3>
            <p className="text-sm text-slate-600">
              Visualize your workflow with customizable boards, lists, and cards. Drag and drop to
              organize tasks effortlessly.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-emerald-100 p-3">
              <svg
                className="h-6 w-6 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Team Collaboration</h3>
            <p className="text-sm text-slate-600">
              Invite team members, assign tasks, and keep everyone aligned with real-time updates
              and @mentions.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-purple-100 p-3">
              <svg
                className="h-6 w-6 text-purple-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Real-Time Sync</h3>
            <p className="text-sm text-slate-600">
              See changes instantly with WebSocket-powered updates. No refresh needed—stay in sync
              with your team.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-amber-100 p-3">
              <svg
                className="h-6 w-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Checklists & Due Dates</h3>
            <p className="text-sm text-slate-600">
              Break down tasks with checklists, set due dates, and never miss a deadline with smart
              reminders.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-rose-100 p-3">
              <svg
                className="h-6 w-6 text-rose-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Labels & Filters</h3>
            <p className="text-sm text-slate-600">
              Organize cards with colorful labels and powerful filters. Find what you need in
              seconds.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-lg bg-indigo-100 p-3">
              <svg
                className="h-6 w-6 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">Smart Notifications</h3>
            <p className="text-sm text-slate-600">
              Get notified about assignments, mentions, and comments. Stay informed without the
              noise.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-center text-white shadow-lg">
          <h2 className="mb-2 text-2xl font-bold">Ready to boost your productivity?</h2>
          <p className="mb-6 text-blue-100">
            Join thousands of teams already using EpiTrello to ship faster.
          </p>
          {initialized && (
            <Link
              to="/register"
              className="inline-flex items-center rounded-lg bg-white px-6 py-3 text-base font-medium text-blue-600 shadow transition hover:bg-blue-50"
            >
              Create your free account
            </Link>
          )}
        </div>
      </section>
    );
  }

  // Get recent boards (up to 4)
  const recentBoards = boards.slice(0, 4);

  return (
    <section className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-slate-900">Welcome back, {user.username}</h1>
          <p className="text-sm text-slate-600">Pick up where you left off</p>
        </div>
        <Link
          to="/boards"
          className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600"
        >
          View all boards
        </Link>
      </header>

      {/* Recent Boards */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">Your Boards</h2>
          {boards.length > 4 && (
            <Link to="/boards" className="text-sm font-medium text-blue-600 hover:text-blue-700">
              See all →
            </Link>
          )}
        </div>
        {boardsStatus === 'loading' && boards.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading boards...</p>
        ) : boards.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-8 text-center">
            <svg
              className="mx-auto h-10 w-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
              />
            </svg>
            <p className="mt-2 text-sm text-slate-600">No boards yet</p>
            <Link
              to="/boards"
              className="mt-3 inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              Create your first board →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {recentBoards.map((board) => (
              <BoardCard key={board.id} board={board} isOwner={board.owner === user?.id} />
            ))}
          </div>
        )}
      </div>

      {/* Urgent Items - only show if there are any */}
      {(overdueCards.length > 0 || dueSoonCards.length > 0) && (
        <div className="grid gap-4 lg:grid-cols-2">
          {overdueCards.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-red-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="font-semibold text-red-800">Overdue</h2>
                <span className="ml-auto rounded-full bg-red-200 px-2 py-0.5 text-xs font-medium text-red-800">
                  {overdueCards.length}
                </span>
              </div>
              <div className="space-y-2">
                {overdueCards.slice(0, 3).map((card) => (
                  <CardItem key={card.id} card={card} />
                ))}
              </div>
            </div>
          )}

          {dueSoonCards.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h2 className="font-semibold text-amber-800">Due Soon</h2>
                <span className="ml-auto rounded-full bg-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {dueSoonCards.length}
                </span>
              </div>
              <div className="space-y-2">
                {dueSoonCards.slice(0, 3).map((card) => (
                  <CardItem key={card.id} card={card} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Your Assigned Cards */}
      {myCards.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Assigned to You</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
              {myCards.length} cards
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {myCards.map((card) => (
              <CardItem key={card.id} card={card} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default HomePage;

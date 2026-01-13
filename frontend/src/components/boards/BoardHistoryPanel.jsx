import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo } from 'react';

// ============================================================================
// Helpers
// ============================================================================
const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatRelativeTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDateTime(value);
};

// ============================================================================
// Icons
// ============================================================================
const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const BoardIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
    />
  </svg>
);

const ListIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
  </svg>
);

const CardIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

const UserIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
    />
  </svg>
);

const RefreshIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

// ============================================================================
// Config
// ============================================================================
const entityTypeConfig = {
  board: {
    icon: BoardIcon,
    colorClass: 'bg-purple-100 text-purple-600',
  },
  list: {
    icon: ListIcon,
    colorClass: 'bg-blue-100 text-blue-600',
  },
  card: {
    icon: CardIcon,
    colorClass: 'bg-green-100 text-green-600',
  },
  member: {
    icon: UserIcon,
    colorClass: 'bg-amber-100 text-amber-600',
  },
};

// ============================================================================
// Sub-components
// ============================================================================
const ActivityItem = ({ entry, resolveMemberLabel }) => {
  const config = entityTypeConfig[entry.entityType] || entityTypeConfig.board;
  const IconComponent = config.icon;

  const actorName = resolveMemberLabel(entry.actor);

  // Build descriptive text
  const buildDescription = () => {
    let text = entry.action;
    if (entry.entityTitle) {
      text += ` "${entry.entityTitle}"`;
    }
    if (entry.details) {
      text += ` ${entry.details}`;
    }
    return text;
  };

  return (
    <li className="group relative flex gap-3 pb-4">
      {/* Timeline connector */}
      <div className="flex flex-col items-center">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full ${config.colorClass}`}
        >
          <IconComponent />
        </div>
        <div className="w-px flex-1 bg-slate-200 group-last:hidden" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="text-sm text-slate-700">
          <span className="font-medium text-slate-900">{actorName}</span> {buildDescription()}
        </p>
        <p className="mt-1 text-xs text-slate-500" title={formatDateTime(entry.createdAt)}>
          {formatRelativeTime(entry.createdAt)}
        </p>
      </div>
    </li>
  );
};

ActivityItem.propTypes = {
  entry: PropTypes.shape({
    id: PropTypes.string.isRequired,
    actor: PropTypes.string,
    action: PropTypes.string.isRequired,
    entityType: PropTypes.string.isRequired,
    entityId: PropTypes.string,
    entityTitle: PropTypes.string,
    details: PropTypes.string,
    createdAt: PropTypes.string,
  }).isRequired,
  resolveMemberLabel: PropTypes.func.isRequired,
};

const LoadingSpinner = () => (
  <div className="flex items-center justify-center py-8">
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
  </div>
);

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 rounded-full bg-slate-100 p-4">
      <HistoryIcon />
    </div>
    <h3 className="text-sm font-medium text-slate-700">No activity yet</h3>
    <p className="mt-1 text-sm text-slate-500">Actions on this board will appear here</p>
  </div>
);

const ErrorState = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <div className="mb-4 rounded-full bg-red-100 p-4 text-red-600">
      <svg
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    </div>
    <h3 className="text-sm font-medium text-slate-700">Failed to load activity</h3>
    <p className="mt-1 text-sm text-slate-500">{error}</p>
    {onRetry && (
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
      >
        <RefreshIcon />
        Retry
      </button>
    )}
  </div>
);

ErrorState.propTypes = {
  error: PropTypes.string.isRequired,
  onRetry: PropTypes.func,
};

// ============================================================================
// Main Component
// ============================================================================
const BoardHistoryPanel = ({
  isOpen,
  onClose,
  activity,
  activityStatus,
  activityError,
  hasMoreActivity,
  onFetchActivity,
  onLoadMore,
  boardMembers,
}) => {
  // Fetch activity when panel opens
  useEffect(() => {
    if (isOpen && activityStatus === 'idle') {
      onFetchActivity();
    }
  }, [isOpen, activityStatus, onFetchActivity]);

  // Resolve member names
  const resolveMemberLabel = useCallback(
    (userId) => {
      if (!userId) return 'Unknown';
      const member = boardMembers.find((m) => m.id === userId);
      return member?.username || 'Unknown user';
    },
    [boardMembers],
  );

  // Get the oldest activity timestamp for pagination
  const oldestTimestamp = useMemo(() => {
    if (activity.length === 0) return null;
    return activity[activity.length - 1]?.createdAt;
  }, [activity]);

  const handleLoadMore = useCallback(() => {
    if (oldestTimestamp && onLoadMore) {
      onLoadMore(oldestTimestamp);
    }
  }, [oldestTimestamp, onLoadMore]);

  const handleRefresh = useCallback(() => {
    onFetchActivity();
  }, [onFetchActivity]);

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isLoading = activityStatus === 'loading';
  const hasError = activityStatus === 'failed';
  const hasActivity = activity.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="presentation">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 z-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        aria-label="Close history panel"
        onClick={onClose}
        tabIndex={-1}
      />

      {/* Panel */}
      <div className="relative z-10 flex h-full w-full max-w-md flex-col bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
              <HistoryIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Board Activity</h2>
              <p className="text-sm text-slate-500">Recent actions on this board</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isLoading}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              title="Refresh"
            >
              <RefreshIcon />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoading && !hasActivity && <LoadingSpinner />}

          {hasError && !hasActivity && <ErrorState error={activityError} onRetry={handleRefresh} />}

          {!isLoading && !hasError && !hasActivity && <EmptyState />}

          {hasActivity && (
            <>
              <ul className="space-y-0">
                {activity.map((entry) => (
                  <ActivityItem
                    key={entry.id}
                    entry={entry}
                    resolveMemberLabel={resolveMemberLabel}
                  />
                ))}
              </ul>

              {/* Load More Button */}
              {hasMoreActivity && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={isLoading}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-200 border-t-slate-600" />
                        Loading...
                      </>
                    ) : (
                      'Load more'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

BoardHistoryPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  activity: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      actor: PropTypes.string,
      action: PropTypes.string.isRequired,
      entityType: PropTypes.string.isRequired,
      entityId: PropTypes.string,
      entityTitle: PropTypes.string,
      details: PropTypes.string,
      createdAt: PropTypes.string,
    }),
  ).isRequired,
  activityStatus: PropTypes.oneOf(['idle', 'loading', 'succeeded', 'failed']).isRequired,
  activityError: PropTypes.string,
  hasMoreActivity: PropTypes.bool.isRequired,
  onFetchActivity: PropTypes.func.isRequired,
  onLoadMore: PropTypes.func.isRequired,
  boardMembers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string,
    }),
  ).isRequired,
};

export default BoardHistoryPanel;

import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';

import UserAvatar from '../common/UserAvatar.jsx';

const ActiveUserAvatar = ({ user, size = 'md', showTooltip = true, className = '' }) => {
  const [showTooltipState, setShowTooltipState] = useState(false);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => showTooltip && setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
    >
      <UserAvatar
        user={{ id: user.userId, username: user.username, avatarUrl: user.avatarUrl }}
        size={size}
        ringColor="ring-white/80"
      />

      <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />

      {showTooltip && showTooltipState && (
        <div className="absolute -bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-lg">
          {user.username}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
        </div>
      )}
    </div>
  );
};

ActiveUserAvatar.propTypes = {
  user: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    avatarUrl: PropTypes.string,
  }).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showTooltip: PropTypes.bool,
  className: PropTypes.string,
};

const ActiveUsersDisplay = ({
  users = [],
  currentUserId,
  maxVisible = 5,
  size = 'md',
  className = '',
}) => {
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Total count includes current user
  const totalUserCount = users.length;

  // Filter out current user for avatar display and sort by join time
  const otherUsers = useMemo(() => {
    return users
      .filter((user) => user.userId !== currentUserId)
      .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
  }, [users, currentUserId]);

  const visibleUsers = otherUsers.slice(0, maxVisible);
  const overflowCount = otherUsers.length - maxVisible;
  const hasOverflow = overflowCount > 0;

  if (totalUserCount === 0) {
    return null;
  }

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className="flex -space-x-2">
        {visibleUsers.map((user) => (
          <ActiveUserAvatar
            key={user.userId}
            user={user}
            size={size}
            className="transition-transform hover:z-10 hover:scale-110"
          />
        ))}

        {hasOverflow && (
          <button
            type="button"
            onClick={() => setShowAllUsers(!showAllUsers)}
            className={`${sizeClasses[size]} relative flex items-center justify-center rounded-full border-2 border-white/80 bg-slate-600 font-medium text-white shadow-sm transition-transform hover:scale-110 hover:bg-slate-500`}
            aria-label={`Show ${overflowCount} more users`}
          >
            +{overflowCount}
          </button>
        )}
      </div>

      {/* Label */}
      <span className="ml-3 text-sm text-white/80">
        {totalUserCount} {totalUserCount === 1 ? 'user' : 'users'} online
      </span>

      {/* Expanded user list dropdown */}
      {showAllUsers && hasOverflow && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowAllUsers(false)}
            onKeyDown={(e) => e.key === 'Escape' && setShowAllUsers(false)}
            role="button"
            tabIndex={0}
            aria-label="Close user list"
          />

          {/* Dropdown */}
          <div className="absolute left-0 top-full z-50 mt-2 max-h-64 w-56 overflow-y-auto rounded-lg border border-white/20 bg-slate-800/95 p-2 shadow-xl backdrop-blur">
            <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              All active users ({totalUserCount})
            </p>
            <ul className="space-y-1">
              {otherUsers.map((user) => (
                <li
                  key={user.userId}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/10"
                >
                  <ActiveUserAvatar user={user} size="sm" showTooltip={false} />
                  <span className="truncate text-sm text-white">{user.username}</span>
                  <span className="ml-auto h-2 w-2 rounded-full bg-green-400" />
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

ActiveUsersDisplay.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      userId: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      avatarUrl: PropTypes.string,
      joinedAt: PropTypes.string,
    }),
  ),
  currentUserId: PropTypes.string,
  maxVisible: PropTypes.number,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  className: PropTypes.string,
};

export { ActiveUserAvatar };
export default ActiveUsersDisplay;

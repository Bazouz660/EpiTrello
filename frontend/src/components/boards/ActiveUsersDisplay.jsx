import PropTypes from 'prop-types';
import { useMemo, useState } from 'react';

/**
 * Color palette for user avatars (when no avatarUrl is provided)
 */
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-pink-500',
  'bg-orange-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-amber-500',
];

/**
 * Get a consistent color for a user based on their userId
 * @param {string} userId
 * @returns {string} Tailwind color class
 */
const getAvatarColor = (userId) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

/**
 * Get initials from username
 * @param {string} username
 * @returns {string} Up to 2 initials
 */
const getInitials = (username) => {
  if (!username) return '?';
  const parts = username.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

/**
 * Individual user avatar component
 */
const UserAvatar = ({ user, size = 'md', showTooltip = true, className = '' }) => {
  const [showTooltipState, setShowTooltipState] = useState(false);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base',
  };

  const avatarColor = useMemo(() => getAvatarColor(user.userId), [user.userId]);
  const initials = useMemo(() => getInitials(user.username), [user.username]);

  return (
    <div
      className={`relative ${className}`}
      onMouseEnter={() => showTooltip && setShowTooltipState(true)}
      onMouseLeave={() => setShowTooltipState(false)}
    >
      {user.avatarUrl ? (
        <img
          src={user.avatarUrl}
          alt={user.username}
          className={`${sizeClasses[size]} rounded-full border-2 border-white/80 object-cover shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} ${avatarColor} flex items-center justify-center rounded-full border-2 border-white/80 font-medium text-white shadow-sm`}
        >
          {initials}
        </div>
      )}

      {/* Online indicator */}
      <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full bg-green-400 ring-2 ring-white" />

      {/* Tooltip */}
      {showTooltip && showTooltipState && (
        <div className="absolute -bottom-8 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs text-white shadow-lg">
          {user.username}
          <div className="absolute -top-1 left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-900" />
        </div>
      )}
    </div>
  );
};

UserAvatar.propTypes = {
  user: PropTypes.shape({
    userId: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    avatarUrl: PropTypes.string,
  }).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
  showTooltip: PropTypes.bool,
  className: PropTypes.string,
};

/**
 * Displays active users on a board with avatars
 * Supports 10+ simultaneous users with overflow indicator
 */
const ActiveUsersDisplay = ({
  users = [],
  currentUserId,
  maxVisible = 5,
  size = 'md',
  className = '',
}) => {
  const [showAllUsers, setShowAllUsers] = useState(false);

  // Filter out current user and sort by join time
  const filteredUsers = useMemo(() => {
    return users
      .filter((user) => user.userId !== currentUserId)
      .sort((a, b) => new Date(a.joinedAt) - new Date(b.joinedAt));
  }, [users, currentUserId]);

  const visibleUsers = filteredUsers.slice(0, maxVisible);
  const overflowCount = filteredUsers.length - maxVisible;
  const hasOverflow = overflowCount > 0;

  if (filteredUsers.length === 0) {
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
          <UserAvatar
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
        {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'} online
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
              All active users ({filteredUsers.length})
            </p>
            <ul className="space-y-1">
              {filteredUsers.map((user) => (
                <li
                  key={user.userId}
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-white/10"
                >
                  <UserAvatar user={user} size="sm" showTooltip={false} />
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

export { UserAvatar };
export default ActiveUsersDisplay;

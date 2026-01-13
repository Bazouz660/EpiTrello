import PropTypes from 'prop-types';
import { useMemo, memo } from 'react';

/**
 * Color palette for user cursors
 */
const CURSOR_COLORS = [
  { bg: 'bg-blue-500', border: 'border-blue-600', text: 'text-blue-500' },
  { bg: 'bg-green-500', border: 'border-green-600', text: 'text-green-500' },
  { bg: 'bg-purple-500', border: 'border-purple-600', text: 'text-purple-500' },
  { bg: 'bg-pink-500', border: 'border-pink-600', text: 'text-pink-500' },
  { bg: 'bg-orange-500', border: 'border-orange-600', text: 'text-orange-500' },
  { bg: 'bg-teal-500', border: 'border-teal-600', text: 'text-teal-500' },
  { bg: 'bg-indigo-500', border: 'border-indigo-600', text: 'text-indigo-500' },
  { bg: 'bg-rose-500', border: 'border-rose-600', text: 'text-rose-500' },
  { bg: 'bg-cyan-500', border: 'border-cyan-600', text: 'text-cyan-500' },
  { bg: 'bg-amber-500', border: 'border-amber-600', text: 'text-amber-500' },
];

/**
 * Get a consistent color scheme for a user based on their userId
 * @param {string} userId
 * @returns {object} Color scheme object
 */
const getCursorColor = (userId) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CURSOR_COLORS[Math.abs(hash) % CURSOR_COLORS.length];
};

/**
 * Get first name or username abbreviation
 * @param {string} username
 * @returns {string}
 */
const getDisplayName = (username) => {
  if (!username) return 'User';
  const parts = username.trim().split(/\s+/);
  return parts[0];
};

/**
 * Individual user cursor component
 * Shows cursor pointer and username label
 */
const UserCursor = memo(({ userId, username, avatarUrl, x, y }) => {
  const colors = useMemo(() => getCursorColor(userId), [userId]);
  const displayName = useMemo(() => getDisplayName(username), [username]);

  return (
    <div
      className="pointer-events-none absolute z-50 transition-all duration-75 ease-out"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: 'translate(-2px, -2px)',
      }}
    >
      {/* Cursor SVG */}
      <svg
        className={`h-5 w-5 drop-shadow-md ${colors.text}`}
        viewBox="0 0 24 24"
        fill="currentColor"
        style={{ filter: 'drop-shadow(1px 1px 1px rgba(0,0,0,0.3))' }}
      >
        <path d="M5.5 3.21V20.8c0 .45.54.67.85.35l4.86-4.86h7.29c.45 0 .67-.54.35-.85L5.85 2.44c-.31-.31-.85-.09-.85.35z" />
      </svg>

      {/* Username label */}
      <div
        className={`${colors.bg} absolute left-4 top-3 flex items-center gap-1.5 whitespace-nowrap rounded-full py-0.5 text-xs font-medium text-white shadow-md ${avatarUrl ? 'pl-1 pr-2.5' : 'px-2'}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="h-4 w-4 flex-shrink-0 rounded-full object-cover" />
        ) : null}
        <span>{displayName}</span>
      </div>
    </div>
  );
});

UserCursor.displayName = 'UserCursor';

UserCursor.propTypes = {
  userId: PropTypes.string.isRequired,
  username: PropTypes.string.isRequired,
  avatarUrl: PropTypes.string,
  x: PropTypes.number.isRequired,
  y: PropTypes.number.isRequired,
};

/**
 * Container component that renders all user cursors
 * Positions cursors relative to the board area
 */
const UserCursorsOverlay = ({ cursorPositions = {}, currentUserId }) => {
  // Filter out current user and convert to array
  const cursors = useMemo(() => {
    return Object.entries(cursorPositions)
      .filter(([userId]) => userId !== currentUserId)
      .map(([userId, data]) => ({
        userId,
        ...data,
      }));
  }, [cursorPositions, currentUserId]);

  if (cursors.length === 0) {
    return null;
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {cursors.map((cursor) => (
        <UserCursor
          key={cursor.userId}
          userId={cursor.userId}
          username={cursor.username}
          avatarUrl={cursor.avatarUrl}
          x={cursor.x}
          y={cursor.y}
        />
      ))}
    </div>
  );
};

UserCursorsOverlay.propTypes = {
  cursorPositions: PropTypes.objectOf(
    PropTypes.shape({
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      username: PropTypes.string.isRequired,
      avatarUrl: PropTypes.string,
      lastUpdate: PropTypes.number,
    }),
  ),
  currentUserId: PropTypes.string,
};

export { UserCursor };
export default UserCursorsOverlay;

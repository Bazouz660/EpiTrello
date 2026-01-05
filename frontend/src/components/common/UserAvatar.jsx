import PropTypes from 'prop-types';
import { useMemo } from 'react';

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

const getAvatarColor = (id) => {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getInitials = (username) => {
  if (!username) return '?';
  const parts = username.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const sizeConfig = {
  xs: { container: 'h-5 w-5 text-[10px]', ring: 'ring-1' },
  sm: { container: 'h-6 w-6 text-xs', ring: 'ring-2' },
  md: { container: 'h-8 w-8 text-sm', ring: 'ring-2' },
  lg: { container: 'h-10 w-10 text-base', ring: 'ring-2' },
  xl: { container: 'h-12 w-12 text-lg', ring: 'ring-2' },
};

const UserAvatar = ({
  user,
  size = 'md',
  showTooltip = false,
  className = '',
  ringColor = 'ring-white',
}) => {
  const userId = user?.id || user?.userId || '';
  const username = user?.username || user?.displayName || '';
  const avatarUrl = user?.avatarUrl || null;

  const avatarColor = useMemo(() => getAvatarColor(userId), [userId]);
  const initials = useMemo(() => getInitials(username), [username]);
  const config = sizeConfig[size] || sizeConfig.md;

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={username ? `${username}'s avatar` : 'User avatar'}
        title={showTooltip ? username : undefined}
        className={`${config.container} ${config.ring} ${ringColor} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${config.container} ${config.ring} ${ringColor} ${avatarColor} flex items-center justify-center rounded-full font-medium text-white ${className}`}
      title={showTooltip ? username : undefined}
      aria-label={username ? `${username}'s avatar` : 'User avatar'}
    >
      {initials}
    </div>
  );
};

UserAvatar.propTypes = {
  user: PropTypes.shape({
    id: PropTypes.string,
    userId: PropTypes.string,
    username: PropTypes.string,
    displayName: PropTypes.string,
    avatarUrl: PropTypes.string,
  }),
  size: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']),
  showTooltip: PropTypes.bool,
  className: PropTypes.string,
  ringColor: PropTypes.string,
};

export default UserAvatar;

import PropTypes from 'prop-types';
import { useMemo } from 'react';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const AvatarColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
];

const getAvatarColor = (id) => {
  if (!id) return AvatarColors[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AvatarColors[Math.abs(hash) % AvatarColors.length];
};

const MemberAvatar = ({ member, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'h-6 w-6 text-[10px]' : 'h-8 w-8 text-xs';

  if (member?.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={member.username || 'Member'}
        className={`${sizeClasses} rounded-full object-cover ring-2 ring-white/20`}
      />
    );
  }

  const initials = getInitials(member?.username || member?.email);
  const colorClass = getAvatarColor(member?.id);

  return (
    <div
      className={`${sizeClasses} ${colorClass} flex items-center justify-center rounded-full font-medium text-white ring-2 ring-white/20`}
      title={member?.username || member?.email || 'Member'}
    >
      {initials}
    </div>
  );
};

MemberAvatar.propTypes = {
  member: PropTypes.shape({
    id: PropTypes.string,
    username: PropTypes.string,
    email: PropTypes.string,
    avatarUrl: PropTypes.string,
  }),
  size: PropTypes.oneOf(['sm', 'md']),
};

const CardListItem = ({ card, onOpenDetail, boardMembers = [] }) => {
  const assignedMembersData = useMemo(() => {
    if (!card.assignedMembers?.length) return [];
    const memberMap = new Map(boardMembers.map((m) => [m.id, m]));
    return card.assignedMembers
      .map((id) => memberMap.get(id) || { id, username: null })
      .slice(0, 5); // Show max 5 avatars
  }, [card.assignedMembers, boardMembers]);

  const extraCount = (card.assignedMembers?.length || 0) - 5;

  return (
    <button
      type="button"
      aria-label={`Open details for ${card.title}`}
      onClick={onOpenDetail}
      className="group w-full space-y-2 rounded-md border border-white/25 bg-white/10 p-3 text-left text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      <p className="text-sm font-semibold leading-snug text-white">{card.title}</p>

      <div className="flex flex-wrap items-center gap-2">
        {card.description && (
          <div
            aria-label="Card has description"
            className="inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white/80"
          >
            <svg
              viewBox="0 0 24 24"
              className="mr-1 h-3 w-3 fill-current text-white/70"
              aria-hidden="true"
            >
              <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zm0 2v16h12V8h-4V4H6zm2 8h8v2H8v-2zm0 4h8v2H8v-2zm0-8h4v2H8V8z" />
            </svg>
            <span className="sr-only">Has description</span>
          </div>
        )}

        {assignedMembersData.length > 0 && (
          <div
            className="flex -space-x-1.5"
            aria-label={`${card.assignedMembers.length} assigned members`}
          >
            {assignedMembersData.map((member) => (
              <MemberAvatar key={member.id} member={member} size="sm" />
            ))}
            {extraCount > 0 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-[10px] font-medium text-white ring-2 ring-white/20">
                +{extraCount}
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] text-white/70">Click to view details</p>
    </button>
  );
};

CardListItem.propTypes = {
  card: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    assignedMembers: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onOpenDetail: PropTypes.func.isRequired,
  boardMembers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string,
      email: PropTypes.string,
      avatarUrl: PropTypes.string,
    }),
  ),
};

export default CardListItem;

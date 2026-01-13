import PropTypes from 'prop-types';
import { useMemo } from 'react';

import UserAvatar from '../common/UserAvatar.jsx';

const formatDueDate = (dueDate) => {
  if (!dueDate) return null;
  const date = new Date(dueDate);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const formatted = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  let status = 'default';
  if (diffDays < 0) {
    status = 'overdue';
  } else if (diffDays <= 1) {
    status = 'due-soon';
  }

  return { formatted, status };
};

const CardListItem = ({ card, onOpenDetail, boardMembers = [] }) => {
  const assignedMembersData = useMemo(() => {
    if (!card.assignedMembers?.length) return [];
    const memberMap = new Map(boardMembers.map((m) => [m.id, m]));
    return card.assignedMembers
      .map((id) => memberMap.get(id) || { id, username: null })
      .slice(0, 5);
  }, [card.assignedMembers, boardMembers]);

  const extraCount = (card.assignedMembers?.length || 0) - 5;
  const dueDateInfo = formatDueDate(card.dueDate);

  return (
    <button
      type="button"
      aria-label={`Open details for ${card.title}`}
      onClick={onOpenDetail}
      className="group w-full space-y-2 rounded-md border border-white/25 bg-white/10 p-3 text-left text-white transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {/* Labels */}
      {card.labels?.length > 0 && (
        <div className="flex flex-wrap gap-1" aria-label="Card labels">
          {card.labels.map((label, index) => (
            <span
              key={index}
              className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: label.color }}
              aria-label={label.text || `Label: ${label.color}`}
            >
              {label.text || ''}
            </span>
          ))}
        </div>
      )}

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

        {/* Due Date */}
        {dueDateInfo && (
          <div
            aria-label={`Due date: ${dueDateInfo.formatted}`}
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
              dueDateInfo.status === 'overdue'
                ? 'bg-red-500/80 text-white'
                : dueDateInfo.status === 'due-soon'
                  ? 'bg-yellow-500/80 text-black'
                  : 'bg-white/10 text-white/80'
            }`}
          >
            <svg
              viewBox="0 0 24 24"
              className={`mr-1 h-3 w-3 fill-current ${
                dueDateInfo.status === 'overdue'
                  ? 'text-white'
                  : dueDateInfo.status === 'due-soon'
                    ? 'text-black/70'
                    : 'text-white/70'
              }`}
              aria-hidden="true"
            >
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
            </svg>
            {dueDateInfo.formatted}
          </div>
        )}

        {assignedMembersData.length > 0 && (
          <div
            className="flex -space-x-1.5"
            aria-label={`${card.assignedMembers.length} assigned members`}
          >
            {assignedMembersData.map((member) => (
              <UserAvatar
                key={member.id}
                user={member}
                size="sm"
                showTooltip
                ringColor="ring-white/20"
              />
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
    labels: PropTypes.arrayOf(
      PropTypes.shape({
        color: PropTypes.string.isRequired,
        text: PropTypes.string,
      }),
    ),
    dueDate: PropTypes.string,
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

import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ============================================================================
// Icons
// ============================================================================
const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const SearchIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const CrownIcon = () => (
  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm14 3c0 .6-.4 1-1 1H6c-.6 0-1-.4-1-1v-1h14v1z" />
  </svg>
);

const ShieldIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
    />
  </svg>
);

const UserPlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
    />
  </svg>
);

// ============================================================================
// Constants
// ============================================================================
const roleConfig = {
  owner: {
    label: 'Owner',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: CrownIcon,
    priority: 0,
  },
  admin: {
    label: 'Admin',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: ShieldIcon,
    priority: 1,
  },
  member: {
    label: 'Member',
    badgeClass: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: null,
    priority: 2,
  },
  viewer: {
    label: 'Viewer',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: null,
    priority: 3,
  },
};

const roleOptions = [
  { value: 'viewer', label: 'Viewer', description: 'Can view board content' },
  { value: 'member', label: 'Member', description: 'Can edit cards and lists' },
  { value: 'admin', label: 'Admin', description: 'Can manage board settings and members' },
];

// ============================================================================
// Sub-components
// ============================================================================
const MemberAvatar = ({ member, size = 'md' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  const initials = useMemo(() => {
    if (!member.username) return '?';
    return member.username.slice(0, 2).toUpperCase();
  }, [member.username]);

  if (member.avatarUrl) {
    return (
      <img
        src={member.avatarUrl}
        alt={`${member.username}'s avatar`}
        className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white`}
      />
    );
  }

  // Generate a consistent color based on username
  const colorIndex = member.username ? member.username.charCodeAt(0) % 6 : 0;
  const bgColors = [
    'bg-blue-500',
    'bg-green-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-indigo-500',
    'bg-teal-500',
  ];

  return (
    <div
      className={`${sizeClasses[size]} ${bgColors[colorIndex]} flex items-center justify-center rounded-full font-medium text-white ring-2 ring-white`}
      aria-label={`${member.username}'s avatar`}
    >
      {initials}
    </div>
  );
};

MemberAvatar.propTypes = {
  member: PropTypes.shape({
    username: PropTypes.string,
    avatarUrl: PropTypes.string,
  }).isRequired,
  size: PropTypes.oneOf(['sm', 'md', 'lg']),
};

const RoleBadge = ({ memberRole }) => {
  const config = roleConfig[memberRole] || roleConfig.member;
  const IconComponent = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${config.badgeClass}`}
    >
      {IconComponent && <IconComponent />}
      {config.label}
    </span>
  );
};

RoleBadge.propTypes = {
  memberRole: PropTypes.string.isRequired,
};

const MemberListItem = ({
  member,
  isCurrentUser,
  canManage,
  onRoleChange,
  onRemove,
  isUpdating,
  isRemoving,
}) => {
  const isMemberOwner = member.role === 'owner';
  const showManageControls = canManage && !isMemberOwner && !isCurrentUser;

  const handleRemoveClick = () => {
    const confirmed = window.confirm(`Remove ${member.username} from this board?`);
    if (confirmed) {
      onRemove(member.id);
    }
  };

  return (
    <li className="group rounded-lg border border-slate-200 bg-white px-3 py-3 shadow-sm transition-colors hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <MemberAvatar member={member} size="md" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-slate-900">{member.username}</span>
            {isCurrentUser && <span className="text-xs font-normal text-slate-500">(you)</span>}
            <RoleBadge memberRole={member.role} />
          </div>
          <p className="truncate text-sm text-slate-500">{member.email}</p>
        </div>
      </div>
      {showManageControls && (
        <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
          <select
            value={member.role}
            onChange={(e) => onRoleChange(member.id, e.target.value)}
            disabled={isUpdating}
            className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Change role for ${member.username}`}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleRemoveClick}
            disabled={isRemoving}
            className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Remove ${member.username} from board`}
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
};

MemberListItem.propTypes = {
  member: PropTypes.shape({
    id: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    email: PropTypes.string,
    avatarUrl: PropTypes.string,
    role: PropTypes.string.isRequired,
  }).isRequired,
  isCurrentUser: PropTypes.bool,
  canManage: PropTypes.bool,
  isOwner: PropTypes.bool,
  onRoleChange: PropTypes.func,
  onRemove: PropTypes.func,
  isUpdating: PropTypes.bool,
  isRemoving: PropTypes.bool,
};

MemberListItem.defaultProps = {
  isCurrentUser: false,
  canManage: false,
  isOwner: false,
  onRoleChange: () => {},
  onRemove: () => {},
  isUpdating: false,
  isRemoving: false,
};

// ============================================================================
// Main Component
// ============================================================================
const BoardMembersPanel = ({
  isOpen,
  onClose,
  // board prop is defined in propTypes but not used internally
  members,
  currentUserId,
  isLoading,
  error,
  // Management props (optional - only needed if user can manage)
  canManage,
  onSearchUsers,
  searchResults,
  isSearching,
  onAddMember,
  isAddingMember,
  addMemberError,
  onRemoveMember,
  isRemovingMember,
  onUpdateMemberRole,
  isUpdatingMember,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('member');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isAddMode, setIsAddMode] = useState(false);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && isOpen) {
        if (isAddMode) {
          setIsAddMode(false);
          setSearchQuery('');
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isAddMode, onClose]);

  // Reset state when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setIsAddMode(false);
      setDebouncedQuery('');
    }
  }, [isOpen]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2 && onSearchUsers) {
      onSearchUsers(debouncedQuery.trim());
    }
  }, [debouncedQuery, onSearchUsers]);

  // Sort members by role priority
  const sortedMembers = useMemo(() => {
    if (!members || !Array.isArray(members)) return [];
    return [...members].sort((a, b) => {
      const priorityA = roleConfig[a.role]?.priority ?? 99;
      const priorityB = roleConfig[b.role]?.priority ?? 99;
      if (priorityA !== priorityB) return priorityA - priorityB;
      return (a.username || '').localeCompare(b.username || '');
    });
  }, [members]);

  // Filter out users who are already members
  const memberIds = useMemo(() => new Set(members.map((m) => m.id)), [members]);
  const filteredSearchResults = useMemo(
    () => (searchResults || []).filter((user) => !memberIds.has(user.id)),
    [searchResults, memberIds],
  );

  const handleAddMember = useCallback(
    (user) => {
      if (onAddMember) {
        onAddMember(user.id, selectedRole);
        setSearchQuery('');
      }
    },
    [onAddMember, selectedRole],
  );

  const handleRoleChange = useCallback(
    (userId, newRole) => {
      if (onUpdateMemberRole) {
        onUpdateMemberRole(userId, newRole);
      }
    },
    [onUpdateMemberRole],
  );

  const handleRemoveMember = useCallback(
    (userId) => {
      if (onRemoveMember) {
        onRemoveMember(userId);
      }
    },
    [onRemoveMember],
  );

  const memberCount = sortedMembers.length;

  if (!isOpen) return null;

  return (
    <aside
      className="fixed right-0 top-0 z-40 flex h-full w-80 flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
      aria-label="Board members"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Board Members</h2>
          <p className="text-xs text-slate-500">
            {memberCount} {memberCount === 1 ? 'member' : 'members'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close members panel"
        >
          <CloseIcon />
        </button>
      </div>

      {/* Add Member Section (only if canManage) */}
      {canManage && (
        <div className="border-b border-slate-200 bg-white px-4 py-3">
          {!isAddMode ? (
            <button
              type="button"
              onClick={() => setIsAddMode(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
            >
              <UserPlusIcon />
              Add member
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <SearchIcon />
                  </div>
                  <input
                    id="user-search"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by email..."
                    className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMode(false);
                    setSearchQuery('');
                  }}
                  className="rounded-lg px-3 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Cancel adding member"
                >
                  Cancel
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Add as:</span>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="flex-1 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  aria-label="Select role for new member"
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search Results */}
              {searchQuery.trim().length >= 2 && (
                <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
                  {isSearching ? (
                    <div className="px-4 py-3 text-center text-sm text-slate-500">Searching...</div>
                  ) : filteredSearchResults.length > 0 ? (
                    <ul className="max-h-40 divide-y divide-slate-100 overflow-y-auto">
                      {filteredSearchResults.map((user) => (
                        <li key={user.id}>
                          <button
                            type="button"
                            onClick={() => handleAddMember(user)}
                            disabled={isAddingMember}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <MemberAvatar member={user} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">
                                {user.username}
                              </p>
                              <p className="truncate text-xs text-slate-500">{user.email}</p>
                            </div>
                            <span className="text-xs font-medium text-blue-600">Add</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-3 text-center text-sm text-slate-500">
                      No users found
                    </div>
                  )}
                </div>
              )}

              {addMemberError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600">
                  {addMemberError}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Members List */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Loading members...</p>
          </div>
        )}

        {error && !isLoading && (
          <div className="mx-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!isLoading && !error && sortedMembers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-slate-500">No members found</p>
          </div>
        )}

        {!isLoading && !error && sortedMembers.length > 0 && (
          <ul className="space-y-2" aria-label="Member list">
            {sortedMembers.map((member) => (
              <MemberListItem
                key={member.id}
                member={member}
                isCurrentUser={member.id === currentUserId}
                canManage={canManage}
                onRoleChange={handleRoleChange}
                onRemove={handleRemoveMember}
                isUpdating={isUpdatingMember}
                isRemoving={isRemovingMember}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <p className="text-center text-xs text-slate-400">
          {canManage ? 'You can manage board members' : 'View only'}
        </p>
      </div>
    </aside>
  );
};

BoardMembersPanel.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  board: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    owner: PropTypes.string.isRequired,
  }),
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      email: PropTypes.string,
      avatarUrl: PropTypes.string,
      role: PropTypes.string.isRequired,
    }),
  ),
  currentUserId: PropTypes.string,
  isLoading: PropTypes.bool,
  error: PropTypes.string,
  // Management props
  canManage: PropTypes.bool,
  onSearchUsers: PropTypes.func,
  searchResults: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      avatarUrl: PropTypes.string,
    }),
  ),
  isSearching: PropTypes.bool,
  onAddMember: PropTypes.func,
  isAddingMember: PropTypes.bool,
  addMemberError: PropTypes.string,
  onRemoveMember: PropTypes.func,
  isRemovingMember: PropTypes.bool,
  onUpdateMemberRole: PropTypes.func,
  isUpdatingMember: PropTypes.bool,
};

BoardMembersPanel.defaultProps = {
  board: null,
  members: [],
  currentUserId: null,
  isLoading: false,
  error: null,
  canManage: false,
  onSearchUsers: null,
  searchResults: [],
  isSearching: false,
  onAddMember: null,
  isAddingMember: false,
  addMemberError: null,
  onRemoveMember: null,
  isRemovingMember: false,
  onUpdateMemberRole: null,
  isUpdatingMember: false,
};

export default BoardMembersPanel;
export { MemberAvatar, RoleBadge };

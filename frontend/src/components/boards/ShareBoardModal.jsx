import PropTypes from 'prop-types';
import { useCallback, useEffect, useState } from 'react';

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

const UserIcon = () => (
  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
    />
  </svg>
);

const roleOptions = [
  { value: 'viewer', label: 'Viewer', description: 'Can view board content' },
  { value: 'member', label: 'Member', description: 'Can edit cards and lists' },
  { value: 'admin', label: 'Admin', description: 'Can manage board settings and members' },
];

const getRoleLabel = (role) => {
  const option = roleOptions.find((opt) => opt.value === role);
  return option?.label ?? role;
};

const ShareBoardModal = ({
  board,
  members,
  currentUserId,
  onClose,
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      onSearchUsers(debouncedQuery.trim());
    }
  }, [debouncedQuery, onSearchUsers]);

  const handleAddMember = useCallback(
    (user) => {
      onAddMember(user.id, selectedRole);
      setSearchQuery('');
    },
    [onAddMember, selectedRole],
  );

  const handleRemoveMember = useCallback(
    (userId) => {
      const confirmed = window.confirm('Remove this member from the board?');
      if (confirmed) {
        onRemoveMember(userId);
      }
    },
    [onRemoveMember],
  );

  const handleRoleChange = useCallback(
    (userId, newRole) => {
      onUpdateMemberRole(userId, newRole);
    },
    [onUpdateMemberRole],
  );

  // Filter out users who are already members
  const memberIds = new Set(members.map((m) => m.id));
  const filteredSearchResults = searchResults.filter((user) => !memberIds.has(user.id));

  const isOwner = board.owner === currentUserId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        aria-label="Close share board modal"
        onClick={onClose}
        tabIndex={-1}
      />

      {/* Modal Container */}
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-board-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="share-board-title" className="text-lg font-semibold text-slate-900">
              Share Board
            </h2>
            <p className="text-sm text-slate-600">
              Invite people to collaborate on &quot;{board.title}&quot;
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {/* Search Section */}
          <div className="mb-6">
            <label htmlFor="user-search" className="mb-2 block text-sm font-medium text-slate-700">
              Add people
            </label>
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
                  placeholder="Search by email or username..."
                  className="w-full rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
              <div className="mt-2 rounded-lg border border-slate-200 bg-white shadow-sm">
                {isSearching ? (
                  <div className="px-4 py-3 text-center text-sm text-slate-500">Searching...</div>
                ) : filteredSearchResults.length > 0 ? (
                  <ul className="max-h-48 divide-y divide-slate-100 overflow-y-auto">
                    {filteredSearchResults.map((user) => (
                      <li key={user.id}>
                        <button
                          type="button"
                          onClick={() => handleAddMember(user)}
                          disabled={isAddingMember}
                          className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                              <UserIcon />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-slate-900">
                              {user.username}
                            </p>
                            <p className="truncate text-xs text-slate-500">{user.email}</p>
                          </div>
                          <span className="text-xs font-medium text-blue-600">
                            Add as {getRoleLabel(selectedRole)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-3 text-center text-sm text-slate-500">
                    No users found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            )}

            {addMemberError && (
              <p className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                {addMemberError}
              </p>
            )}
          </div>

          {/* Current Members */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-slate-700">
              Board members ({members.length})
            </h3>
            <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
              {members.map((member) => {
                const isMemberOwner = member.role === 'owner';
                const canManage = isOwner && !isMemberOwner && member.id !== currentUserId;

                return (
                  <li key={member.id} className="flex items-center gap-3 px-4 py-3">
                    {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt=""
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                        <UserIcon />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {member.username}
                        {member.id === currentUserId && (
                          <span className="ml-1.5 text-xs text-slate-500">(you)</span>
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isMemberOwner ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                          Owner
                        </span>
                      ) : canManage ? (
                        <>
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            disabled={isUpdatingMember}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={isRemovingMember}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label={`Remove ${member.username} from board`}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
                          {member.role}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-slate-800"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

ShareBoardModal.propTypes = {
  board: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    owner: PropTypes.string.isRequired,
  }).isRequired,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      avatarUrl: PropTypes.string,
      role: PropTypes.string.isRequired,
    }),
  ).isRequired,
  currentUserId: PropTypes.string.isRequired,
  onClose: PropTypes.func.isRequired,
  onSearchUsers: PropTypes.func.isRequired,
  searchResults: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string.isRequired,
      email: PropTypes.string.isRequired,
      avatarUrl: PropTypes.string,
    }),
  ).isRequired,
  isSearching: PropTypes.bool,
  onAddMember: PropTypes.func.isRequired,
  isAddingMember: PropTypes.bool,
  addMemberError: PropTypes.string,
  onRemoveMember: PropTypes.func.isRequired,
  isRemovingMember: PropTypes.bool,
  onUpdateMemberRole: PropTypes.func.isRequired,
  isUpdatingMember: PropTypes.bool,
};

ShareBoardModal.defaultProps = {
  isSearching: false,
  isAddingMember: false,
  addMemberError: null,
  isRemovingMember: false,
  isUpdatingMember: false,
};

export default ShareBoardModal;

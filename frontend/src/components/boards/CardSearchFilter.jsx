import PropTypes from 'prop-types';
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';

import UserAvatar from '../common/UserAvatar.jsx';

const LABEL_COLORS = [
  { value: '#ef4444', name: 'Red' },
  { value: '#f97316', name: 'Orange' },
  { value: '#eab308', name: 'Yellow' },
  { value: '#22c55e', name: 'Green' },
  { value: '#3b82f6', name: 'Blue' },
  { value: '#8b5cf6', name: 'Purple' },
  { value: '#ec4899', name: 'Pink' },
  { value: '#6b7280', name: 'Gray' },
];

const DUE_DATE_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'today', label: 'Due today' },
  { value: 'week', label: 'Due this week' },
  { value: 'none', label: 'No due date' },
];

const CardSearchFilter = ({
  searchQuery,
  onSearchChange,
  filters,
  onFiltersChange,
  boardMembers = [],
  availableLabels = [],
  isExpanded,
  onToggleExpand,
}) => {
  const [isLabelDropdownOpen, setIsLabelDropdownOpen] = useState(false);
  const [isMemberDropdownOpen, setIsMemberDropdownOpen] = useState(false);
  const [isDueDateDropdownOpen, setIsDueDateDropdownOpen] = useState(false);
  const labelDropdownRef = useRef(null);
  const memberDropdownRef = useRef(null);
  const dueDateDropdownRef = useRef(null);
  const panelRef = useRef(null);

  // Close dropdowns and panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (labelDropdownRef.current && !labelDropdownRef.current.contains(event.target)) {
        setIsLabelDropdownOpen(false);
      }
      if (memberDropdownRef.current && !memberDropdownRef.current.contains(event.target)) {
        setIsMemberDropdownOpen(false);
      }
      if (dueDateDropdownRef.current && !dueDateDropdownRef.current.contains(event.target)) {
        setIsDueDateDropdownOpen(false);
      }
      // Close the entire panel when clicking outside
      if (isExpanded && panelRef.current && !panelRef.current.contains(event.target)) {
        onToggleExpand();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded, onToggleExpand]);

  // Get unique labels from all cards for filtering
  const allLabels = useMemo(() => {
    const labelMap = new Map();
    availableLabels.forEach((label) => {
      const key = `${label.color}-${label.text || ''}`;
      if (!labelMap.has(key)) {
        labelMap.set(key, label);
      }
    });
    return Array.from(labelMap.values());
  }, [availableLabels]);

  const handleLabelToggle = useCallback(
    (labelColor) => {
      const currentLabels = filters.labels || [];
      const newLabels = currentLabels.includes(labelColor)
        ? currentLabels.filter((l) => l !== labelColor)
        : [...currentLabels, labelColor];
      onFiltersChange({ ...filters, labels: newLabels });
    },
    [filters, onFiltersChange],
  );

  const handleMemberToggle = useCallback(
    (memberId) => {
      const currentMembers = filters.members || [];
      const newMembers = currentMembers.includes(memberId)
        ? currentMembers.filter((m) => m !== memberId)
        : [...currentMembers, memberId];
      onFiltersChange({ ...filters, members: newMembers });
    },
    [filters, onFiltersChange],
  );

  const handleDueDateToggle = useCallback(
    (dueDateOption) => {
      const currentDueDates = filters.dueDates || [];
      const newDueDates = currentDueDates.includes(dueDateOption)
        ? currentDueDates.filter((d) => d !== dueDateOption)
        : [...currentDueDates, dueDateOption];
      onFiltersChange({ ...filters, dueDates: newDueDates });
    },
    [filters, onFiltersChange],
  );

  const handleClearFilters = useCallback(() => {
    onSearchChange('');
    onFiltersChange({ labels: [], members: [], dueDates: [] });
  }, [onSearchChange, onFiltersChange]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count += 1;
    if (filters.labels?.length) count += filters.labels.length;
    if (filters.members?.length) count += filters.members.length;
    if (filters.dueDates?.length) count += filters.dueDates.length;
    return count;
  }, [searchQuery, filters]);

  const hasActiveFilters = activeFilterCount > 0;

  return (
    <div className="relative" ref={panelRef}>
      {/* Compact view - just the search/filter toggle button */}
      <button
        type="button"
        onClick={onToggleExpand}
        className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium backdrop-blur transition-colors ${
          hasActiveFilters
            ? 'border-blue-400/60 bg-blue-500/20 text-white hover:bg-blue-500/30'
            : 'border-white/30 bg-white/10 text-white hover:bg-white/20'
        }`}
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
          />
        </svg>
        Search & Filter
        {hasActiveFilters && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold">
            {activeFilterCount}
          </span>
        )}
      </button>

      {/* Expanded view - full search and filter controls (absolutely positioned dropdown) */}
      {isExpanded && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-white/30 bg-slate-800/95 p-4 shadow-xl backdrop-blur-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Search & Filter Cards</h3>
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white"
              aria-label="Close search panel"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Search input */}
          <div className="relative mb-3">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <svg
                className="h-4 w-4 text-white/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search cards by title or description..."
              className="w-full rounded-md border border-white/20 bg-white/10 py-2 pl-10 pr-10 text-sm text-white placeholder-white/50 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/50 hover:text-white"
                aria-label="Clear search"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            )}
          </div>

          {/* Filter buttons */}
          <div className="flex flex-wrap gap-2">
            {/* Labels filter */}
            <div className="relative" ref={labelDropdownRef}>
              <button
                type="button"
                onClick={() => setIsLabelDropdownOpen(!isLabelDropdownOpen)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.labels?.length
                    ? 'border-blue-400/60 bg-blue-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                  />
                </svg>
                Labels
                {filters.labels?.length > 0 && (
                  <span className="rounded-full bg-blue-500 px-1.5 text-[10px]">
                    {filters.labels.length}
                  </span>
                )}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isLabelDropdownOpen && (
                <div className="absolute left-0 top-full z-[60] mt-1 w-48 rounded-md border border-white/20 bg-slate-800 p-2 shadow-lg">
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {allLabels.length > 0 ? (
                      allLabels.map((label, index) => (
                        <button
                          key={`${label.color}-${index}`}
                          type="button"
                          onClick={() => handleLabelToggle(label.color)}
                          className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                            filters.labels?.includes(label.color)
                              ? 'bg-white/20 text-white'
                              : 'text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <span
                            className="h-4 w-6 rounded"
                            style={{ backgroundColor: label.color }}
                          />
                          <span className="flex-1 truncate">{label.text || 'No text'}</span>
                          {filters.labels?.includes(label.color) && (
                            <svg
                              className="h-4 w-4 text-blue-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </button>
                      ))
                    ) : (
                      <p className="px-2 py-1 text-xs text-white/50">No labels available</p>
                    )}
                    {allLabels.length === 0 && (
                      <>
                        <p className="mb-2 px-2 text-xs text-white/50">Filter by color:</p>
                        {LABEL_COLORS.map((color) => (
                          <button
                            key={color.value}
                            type="button"
                            onClick={() => handleLabelToggle(color.value)}
                            className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                              filters.labels?.includes(color.value)
                                ? 'bg-white/20 text-white'
                                : 'text-white/80 hover:bg-white/10'
                            }`}
                          >
                            <span
                              className="h-4 w-6 rounded"
                              style={{ backgroundColor: color.value }}
                            />
                            <span className="flex-1">{color.name}</span>
                            {filters.labels?.includes(color.value) && (
                              <svg
                                className="h-4 w-4 text-blue-400"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Members filter */}
            <div className="relative" ref={memberDropdownRef}>
              <button
                type="button"
                onClick={() => setIsMemberDropdownOpen(!isMemberDropdownOpen)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.members?.length
                    ? 'border-blue-400/60 bg-blue-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
                Members
                {filters.members?.length > 0 && (
                  <span className="rounded-full bg-blue-500 px-1.5 text-[10px]">
                    {filters.members.length}
                  </span>
                )}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isMemberDropdownOpen && (
                <div className="absolute left-0 top-full z-[60] mt-1 w-56 rounded-md border border-white/20 bg-slate-800 p-2 shadow-lg">
                  <div className="max-h-48 space-y-1 overflow-y-auto">
                    {/* Unassigned option */}
                    <button
                      type="button"
                      onClick={() => handleMemberToggle('unassigned')}
                      className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                        filters.members?.includes('unassigned')
                          ? 'bg-white/20 text-white'
                          : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-600 text-xs">
                        ?
                      </div>
                      <span className="flex-1">Unassigned</span>
                      {filters.members?.includes('unassigned') && (
                        <svg
                          className="h-4 w-4 text-blue-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </button>
                    {/* Board members */}
                    {boardMembers.map((member) => (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => handleMemberToggle(member.id)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                          filters.members?.includes(member.id)
                            ? 'bg-white/20 text-white'
                            : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <UserAvatar user={member} size="sm" />
                        <span className="flex-1 truncate">
                          {member.username || member.email || 'Member'}
                        </span>
                        {filters.members?.includes(member.id) && (
                          <svg
                            className="h-4 w-4 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                    {boardMembers.length === 0 && (
                      <p className="px-2 py-1 text-xs text-white/50">No members available</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Due date filter */}
            <div className="relative" ref={dueDateDropdownRef}>
              <button
                type="button"
                onClick={() => setIsDueDateDropdownOpen(!isDueDateDropdownOpen)}
                className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                  filters.dueDates?.length
                    ? 'border-blue-400/60 bg-blue-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-white/80 hover:bg-white/10'
                }`}
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                Due Date
                {filters.dueDates?.length > 0 && (
                  <span className="rounded-full bg-blue-500 px-1.5 text-[10px]">
                    {filters.dueDates.length}
                  </span>
                )}
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isDueDateDropdownOpen && (
                <div className="absolute left-0 top-full z-[60] mt-1 w-44 rounded-md border border-white/20 bg-slate-800 p-2 shadow-lg">
                  <div className="space-y-1">
                    {DUE_DATE_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => handleDueDateToggle(option.value)}
                        className={`flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                          filters.dueDates?.includes(option.value)
                            ? 'bg-white/20 text-white'
                            : 'text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <span className="flex-1">{option.label}</span>
                        {filters.dueDates?.includes(option.value) && (
                          <svg
                            className="h-4 w-4 text-blue-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Clear filters button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition-colors hover:bg-white/10"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Clear all
              </button>
            )}
          </div>

          {/* Active filters summary */}
          {hasActiveFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
              <span className="text-xs text-white/50">Active filters:</span>
              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200">
                  Search: &ldquo;{searchQuery.slice(0, 20)}
                  {searchQuery.length > 20 ? '...' : ''}&rdquo;
                  <button
                    type="button"
                    onClick={() => onSearchChange('')}
                    className="ml-1 hover:text-white"
                    aria-label="Remove search filter"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.labels?.map((color) => (
                <span
                  key={color}
                  className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200"
                >
                  <span className="h-2.5 w-2.5 rounded" style={{ backgroundColor: color }} />
                  Label
                  <button
                    type="button"
                    onClick={() => handleLabelToggle(color)}
                    className="ml-1 hover:text-white"
                    aria-label="Remove label filter"
                  >
                    ×
                  </button>
                </span>
              ))}
              {filters.members?.map((memberId) => {
                const member = boardMembers.find((m) => m.id === memberId);
                return (
                  <span
                    key={memberId}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200"
                  >
                    {memberId === 'unassigned'
                      ? 'Unassigned'
                      : member?.username || member?.email || 'Member'}
                    <button
                      type="button"
                      onClick={() => handleMemberToggle(memberId)}
                      className="ml-1 hover:text-white"
                      aria-label="Remove member filter"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
              {filters.dueDates?.map((dueDate) => {
                const option = DUE_DATE_OPTIONS.find((o) => o.value === dueDate);
                return (
                  <span
                    key={dueDate}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200"
                  >
                    {option?.label || dueDate}
                    <button
                      type="button"
                      onClick={() => handleDueDateToggle(dueDate)}
                      className="ml-1 hover:text-white"
                      aria-label="Remove due date filter"
                    >
                      ×
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

CardSearchFilter.propTypes = {
  searchQuery: PropTypes.string.isRequired,
  onSearchChange: PropTypes.func.isRequired,
  filters: PropTypes.shape({
    labels: PropTypes.arrayOf(PropTypes.string),
    members: PropTypes.arrayOf(PropTypes.string),
    dueDates: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onFiltersChange: PropTypes.func.isRequired,
  boardMembers: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      username: PropTypes.string,
      email: PropTypes.string,
      avatarUrl: PropTypes.string,
    }),
  ),
  availableLabels: PropTypes.arrayOf(
    PropTypes.shape({
      color: PropTypes.string.isRequired,
      text: PropTypes.string,
    }),
  ),
  isExpanded: PropTypes.bool.isRequired,
  onToggleExpand: PropTypes.func.isRequired,
};

export default CardSearchFilter;

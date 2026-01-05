import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

/**
 * Renders text with @mentions highlighted
 */
export const renderTextWithMentions = (text, memberLookup = new Map()) => {
  if (!text) return null;

  // Match @username patterns (alphanumeric, underscore, hyphen)
  const mentionRegex = /@([a-zA-Z0-9_-]+)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    const username = match[1];
    // Check if username exists in members
    const memberExists = Array.from(memberLookup.values()).some(
      (m) => m.username?.toLowerCase() === username.toLowerCase(),
    );

    parts.push(
      <span
        key={`${match.index}-${username}`}
        className={`inline-block rounded px-1 font-medium ${
          memberExists ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
        }`}
      >
        @{username}
      </span>,
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

/**
 * A textarea component with @mention autocomplete support
 */
const MentionTextarea = ({
  value,
  onChange,
  placeholder,
  rows = 3,
  disabled = false,
  className = '',
  members = [],
  id,
  'aria-label': ariaLabel,
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const textareaRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Filter members based on mention query
  const filteredMembers = useMemo(() => {
    if (!mentionQuery) return members.slice(0, 5);
    const query = mentionQuery.toLowerCase();
    return members
      .filter(
        (m) =>
          m.username?.toLowerCase().includes(query) || m.displayName?.toLowerCase().includes(query),
      )
      .slice(0, 5);
  }, [members, mentionQuery]);

  // Detect @ mentions while typing
  const handleChange = useCallback(
    (e) => {
      const newValue = e.target.value;
      const cursorPos = e.target.selectionStart;

      onChange(newValue);

      // Find if we're in a mention context
      const textBeforeCursor = newValue.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
        // Check if there's a space between @ and cursor (no longer in mention)
        if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
          setMentionStart(lastAtIndex);
          setMentionQuery(textAfterAt);
          setShowSuggestions(true);
          setSuggestionIndex(0);
          return;
        }
      }

      setShowSuggestions(false);
      setMentionStart(-1);
      setMentionQuery('');
    },
    [onChange],
  );

  // Insert selected mention
  const insertMention = useCallback(
    (member) => {
      if (mentionStart === -1) return;

      const username = member.username || member.displayName || 'user';
      const beforeMention = value.slice(0, mentionStart);
      const afterMention = value.slice(mentionStart + 1 + mentionQuery.length);
      const newValue = `${beforeMention}@${username} ${afterMention}`;

      onChange(newValue);
      setShowSuggestions(false);
      setMentionStart(-1);
      setMentionQuery('');

      // Focus and set cursor position after the mention
      setTimeout(() => {
        if (textareaRef.current) {
          const newCursorPos = mentionStart + username.length + 2; // +2 for @ and space
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        }
      }, 0);
    },
    [value, onChange, mentionStart, mentionQuery],
  );

  // Handle keyboard navigation in suggestions
  const handleKeyDown = useCallback(
    (e) => {
      if (!showSuggestions || filteredMembers.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSuggestionIndex((prev) => (prev < filteredMembers.length - 1 ? prev + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSuggestionIndex((prev) => (prev > 0 ? prev - 1 : filteredMembers.length - 1));
          break;
        case 'Enter':
        case 'Tab':
          if (showSuggestions && filteredMembers[suggestionIndex]) {
            e.preventDefault();
            insertMention(filteredMembers[suggestionIndex]);
          }
          break;
        case 'Escape':
          setShowSuggestions(false);
          break;
        default:
          break;
      }
    },
    [showSuggestions, filteredMembers, suggestionIndex, insertMention],
  );

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
      />

      {/* Suggestions dropdown */}
      {showSuggestions && filteredMembers.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 z-50 mt-1 max-h-48 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <ul className="py-1">
            {filteredMembers.map((member, index) => (
              <li key={member.id || member.username || index}>
                <button
                  type="button"
                  onClick={() => insertMention(member)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    index === suggestionIndex
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-xs font-bold text-white">
                    {(member.displayName?.[0] || member.username?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{member.displayName || member.username}</p>
                    {member.username && member.displayName && (
                      <p className="truncate text-xs text-slate-500">@{member.username}</p>
                    )}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Hint text */}
      {!showSuggestions && !disabled && (
        <p className="mt-1 text-xs text-slate-400">Type @ to mention someone</p>
      )}
    </div>
  );
};

MentionTextarea.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  rows: PropTypes.number,
  disabled: PropTypes.bool,
  className: PropTypes.string,
  members: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      username: PropTypes.string,
      displayName: PropTypes.string,
    }),
  ),
  id: PropTypes.string,
  'aria-label': PropTypes.string,
};

export default MentionTextarea;

/**
 * Renders text with @mentions highlighted
 */
const renderTextWithMentions = (text, memberLookup = new Map()) => {
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

export default renderTextWithMentions;

import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import UserAvatar from '../common/UserAvatar';

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatInputDateTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

const convertInputToIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

// Icon components for cleaner UI
const CalendarIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
);

const TagIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const ChecklistIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
    />
  </svg>
);

const ChatIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
);

const ActivityIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const DescriptionIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
  </svg>
);

const CloseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const PencilIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
    />
  </svg>
);

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
);

const CardDetailModal = ({
  card,
  boardMembers = [],
  onClose,
  onUpdateCard,
  isSaving,
  updateError,
  onDelete,
  isDeleting,
  deleteError,
  readOnly = false,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [titleValue, setTitleValue] = useState(card.title);
  const [descriptionValue, setDescriptionValue] = useState(card.description ?? '');
  const [dueDateValue, setDueDateValue] = useState(formatInputDateTime(card.dueDate));
  const [labelsState, setLabelsState] = useState(Array.isArray(card.labels) ? card.labels : []);
  const [assignedState, setAssignedState] = useState(
    Array.isArray(card.assignedMembers) ? card.assignedMembers : [],
  );
  const [checklistState, setChecklistState] = useState(
    Array.isArray(card.checklist) ? card.checklist : [],
  );

  const syncStateFromCard = () => {
    setTitleValue(card.title);
    setDescriptionValue(card.description ?? '');
    setDueDateValue(formatInputDateTime(card.dueDate));
    setLabelsState(Array.isArray(card.labels) ? card.labels : []);
    setAssignedState(Array.isArray(card.assignedMembers) ? card.assignedMembers : []);
    setChecklistState(Array.isArray(card.checklist) ? card.checklist : []);
  };

  useEffect(() => {
    setIsEditing(false);
    syncStateFromCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card]);

  const memberLookup = useMemo(() => {
    const map = new Map();
    boardMembers.forEach((member) => {
      if (!member?.id) return;
      map.set(member.id, member);
    });
    return map;
  }, [boardMembers]);

  const resolveMemberLabel = useCallback(
    (memberId) => {
      if (!memberId) return 'Member';
      const entry = memberLookup.get(memberId);
      if (entry?.displayName) return entry.displayName;
      const roleLabel = entry?.role
        ? `${entry.role.charAt(0).toUpperCase()}${entry.role.slice(1)}`
        : 'Member';
      if (typeof memberId === 'string' && memberId.length > 8) {
        return `${roleLabel} · ${memberId.slice(0, 4)}…${memberId.slice(-4)}`;
      }
      return `${roleLabel} · ${memberId}`;
    },
    [memberLookup],
  );

  const assignedMembers = useMemo(() => {
    const source = Array.isArray(assignedState) ? assignedState : [];
    if (source.length === 0) {
      return [];
    }
    return source.map((memberId) => ({
      id: memberId,
      label: resolveMemberLabel(memberId),
    }));
  }, [assignedState, resolveMemberLabel]);

  const comments = useMemo(() => {
    const entries = Array.isArray(card.comments) ? card.comments : [];
    return [...entries].sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }, [card.comments]);

  const activity = useMemo(() => {
    const entries = Array.isArray(card.activity) ? card.activity : [];
    return [...entries].sort((a, b) => {
      const aTime = new Date(a.createdAt ?? 0).getTime();
      const bTime = new Date(b.createdAt ?? 0).getTime();
      return bTime - aTime;
    });
  }, [card.activity]);

  const checklistStats = useMemo(() => {
    const items = Array.isArray(checklistState) ? checklistState : [];
    const completed = items.filter((item) => item.completed).length;
    return { completed, total: items.length };
  }, [checklistState]);

  const beginEditing = () => {
    syncStateFromCard();
    setIsEditing(true);
  };

  const cancelEditing = () => {
    syncStateFromCard();
    setIsEditing(false);
  };

  const handleSaveAll = async (event) => {
    event?.preventDefault();
    const trimmedTitle = titleValue.trim();
    if (!trimmedTitle) {
      setTitleValue(card.title);
      return;
    }

    const payload = {
      title: trimmedTitle,
      description: descriptionValue.trim(),
      dueDate: dueDateValue ? convertInputToIso(dueDateValue) : null,
      labels: labelsState,
      assignedMembers: assignedState,
      checklist: checklistState,
    };

    try {
      await onUpdateCard(payload);
      setIsEditing(false);
    } catch {
      // keep editing mode so the user can adjust values
    }
  };

  const addLabel = () => {
    setLabelsState((prev) => [...prev, { color: '#0f172a', text: '' }]);
  };

  const removeLabel = (index) => {
    setLabelsState((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateLabelField = (index, field, value) => {
    setLabelsState((prev) =>
      prev.map((label, idx) => (idx === index ? { ...label, [field]: value } : label)),
    );
  };

  const toggleAssignedMember = (memberId) => {
    setAssignedState((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId],
    );
  };

  const addChecklistItem = () => {
    setChecklistState((prev) => [...prev, { text: '', completed: false }]);
  };

  const removeChecklistItem = (index) => {
    setChecklistState((prev) => prev.filter((_, idx) => idx !== index));
  };

  const updateChecklistItem = (index, field, value) => {
    setChecklistState((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
  };

  const toggleChecklistCompletion = (index) => {
    setChecklistState((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, completed: !item.completed } : item)),
    );
  };

  const dueDateLabel = card.dueDate ? formatDateTime(card.dueDate) : 'No due date set';

  // Check if due date is overdue or upcoming
  const getDueDateStatus = () => {
    if (!card.dueDate) return null;
    const now = new Date();
    const dueDate = new Date(card.dueDate);
    const diffDays = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 2) return 'soon';
    return 'normal';
  };

  const dueDateStatus = getDueDateStatus();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 z-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        aria-label="Close card details"
        onClick={onClose}
        tabIndex={-1}
      />

      {/* Modal Container */}
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="space-y-2">
                  <label htmlFor="card-title-input" className="sr-only">
                    Card title
                  </label>
                  <input
                    id="card-title-input"
                    value={titleValue}
                    onChange={(event) => setTitleValue(event.target.value)}
                    aria-label="Card title"
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-xl font-bold text-slate-900 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    disabled={isSaving}
                    placeholder="Card title"
                  />
                </div>
              ) : (
                <h2 className="truncate text-xl font-bold text-slate-900 sm:text-2xl">
                  {card.title}
                </h2>
              )}
              {updateError && (
                <p className="mt-2 flex items-center gap-1 text-sm text-rose-600">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                  {updateError}
                </p>
              )}
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2">
              {!readOnly && isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSaveAll}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-70"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Saving…
                      </>
                    ) : (
                      'Save changes'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </>
              ) : !readOnly ? (
                <button
                  type="button"
                  onClick={beginEditing}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                >
                  <PencilIcon />
                  Edit
                </button>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                <CloseIcon />
              </button>
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSaveAll} className="p-6">
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Main Content - Left Column */}
              <div className="space-y-6 lg:col-span-2">
                {/* Description Section */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-slate-700">
                    <DescriptionIcon />
                    <h3 className="text-sm font-semibold">Description</h3>
                  </div>
                  {isEditing ? (
                    <>
                      <label htmlFor="card-description" className="sr-only">
                        Card description
                      </label>
                      <textarea
                        id="card-description"
                        value={descriptionValue}
                        onChange={(event) => setDescriptionValue(event.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        placeholder="Add a more detailed description…"
                        aria-label="Card description"
                        disabled={isSaving}
                      />
                    </>
                  ) : (
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                      {descriptionValue || (
                        <span className="italic text-slate-400">No description provided.</span>
                      )}
                    </p>
                  )}
                </section>

                {/* Checklist Section */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <ChecklistIcon />
                      <h3 className="text-sm font-semibold">Checklist</h3>
                      {checklistStats.total > 0 && (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                          {checklistStats.completed}/{checklistStats.total}
                        </span>
                      )}
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={addChecklistItem}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-300"
                        disabled={isSaving}
                      >
                        <PlusIcon />
                        Add item
                      </button>
                    )}
                  </div>

                  {/* Progress bar */}
                  {checklistStats.total > 0 && (
                    <div className="mb-3">
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                          style={{
                            width: `${(checklistStats.completed / checklistStats.total) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {checklistState.length > 0 ? (
                    <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                      {checklistState.map((item, index) => (
                        <li
                          key={`checklist-${index}`}
                          className="group flex items-center gap-3 rounded-lg bg-white p-2.5 shadow-sm ring-1 ring-slate-200/60"
                        >
                          {isEditing ? (
                            <>
                              <input
                                type="checkbox"
                                checked={Boolean(item.completed)}
                                onChange={() => toggleChecklistCompletion(index)}
                                aria-label={`Toggle checklist item ${index + 1}`}
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                                disabled={isSaving}
                              />
                              <input
                                id={`checklist-text-${index}`}
                                type="text"
                                value={item.text}
                                onChange={(event) =>
                                  updateChecklistItem(index, 'text', event.target.value)
                                }
                                className="min-w-0 flex-1 rounded border-0 bg-transparent px-0 py-0 text-sm text-slate-700 focus:outline-none focus:ring-0"
                                placeholder="Enter task..."
                                disabled={isSaving}
                                aria-label={`Checklist item ${index + 1}`}
                              />
                              <button
                                type="button"
                                onClick={() => removeChecklistItem(index)}
                                className="rounded p-1 text-slate-400 opacity-0 transition-all hover:bg-rose-50 hover:text-rose-500 group-hover:opacity-100"
                                disabled={isSaving}
                              >
                                <TrashIcon />
                              </button>
                            </>
                          ) : (
                            <>
                              <input
                                type="checkbox"
                                checked={Boolean(item.completed)}
                                readOnly
                                className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                              />
                              <span
                                className={`flex-1 text-sm ${item.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                              >
                                {item.text || 'Untitled item'}
                              </span>
                              {Boolean(item.completed) && (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                                  Done
                                </span>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-center text-sm text-slate-400">
                      No checklist items yet.
                    </p>
                  )}
                </section>

                {/* Comments Section */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-slate-700">
                    <ChatIcon />
                    <h3 className="text-sm font-semibold">Comments</h3>
                    {comments.length > 0 && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {comments.length}
                      </span>
                    )}
                  </div>
                  {comments.length > 0 ? (
                    <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
                      {comments.map((comment) => (
                        <li
                          key={comment.id}
                          className="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200/60"
                        >
                          <div className="mb-1 flex items-center gap-2">
                            <UserAvatar
                              user={{
                                id: comment.author,
                                username: resolveMemberLabel(comment.author) || 'Unknown',
                              }}
                              size="sm"
                              showTooltip={false}
                            />
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {resolveMemberLabel(comment.author)}
                              </p>
                              <p className="text-xs text-slate-500">
                                {formatDateTime(comment.createdAt) || 'Unknown time'}
                              </p>
                            </div>
                          </div>
                          <p className="mt-2 text-sm text-slate-700">{comment.text}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-center text-sm text-slate-400">No comments yet.</p>
                  )}
                </section>

                {/* Activity Section */}
                <section className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <div className="mb-3 flex items-center gap-2 text-slate-700">
                    <ActivityIcon />
                    <h3 className="text-sm font-semibold">Activity</h3>
                    {activity.length > 0 && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {activity.length}
                      </span>
                    )}
                  </div>
                  {activity.length > 0 ? (
                    <ul className="max-h-64 space-y-2 overflow-y-auto pr-1">
                      {activity.map((entry) => (
                        <li key={entry.id} className="relative flex gap-3 pb-2">
                          <div className="flex flex-col items-center">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200">
                              <div className="h-2 w-2 rounded-full bg-slate-400" />
                            </div>
                            <div className="w-px flex-1 bg-slate-200" />
                          </div>
                          <div className="flex-1 pb-2">
                            <p className="text-sm text-slate-700">{entry.message}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {resolveMemberLabel(entry.actor)} ·{' '}
                              {formatDateTime(entry.createdAt) || 'Unknown time'}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="py-4 text-center text-sm text-slate-400">No activity yet.</p>
                  )}
                </section>
              </div>

              {/* Sidebar - Right Column */}
              <div className="space-y-4">
                {/* Due Date */}
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <CalendarIcon />
                      <h3 className="text-sm font-semibold">Due date</h3>
                    </div>
                    {isEditing && dueDateValue && (
                      <button
                        type="button"
                        onClick={() => setDueDateValue('')}
                        className="text-xs text-slate-500 hover:text-slate-700"
                        disabled={isSaving}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {isEditing ? (
                    <input
                      id="card-due-date"
                      type="datetime-local"
                      value={dueDateValue}
                      onChange={(event) => setDueDateValue(event.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      aria-label="Card due date"
                      disabled={isSaving}
                    />
                  ) : (
                    <div
                      className={`rounded-lg px-3 py-2 text-sm ${
                        dueDateStatus === 'overdue'
                          ? 'bg-rose-50 text-rose-700'
                          : dueDateStatus === 'soon'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {dueDateLabel}
                      {dueDateStatus === 'overdue' && (
                        <span className="ml-2 text-xs font-medium">Overdue</span>
                      )}
                      {dueDateStatus === 'soon' && (
                        <span className="ml-2 text-xs font-medium">Due soon</span>
                      )}
                    </div>
                  )}
                </section>

                {/* Labels */}
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-700">
                      <TagIcon />
                      <h3 className="text-sm font-semibold">Labels</h3>
                    </div>
                    {isEditing && (
                      <button
                        type="button"
                        onClick={addLabel}
                        className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                        disabled={isSaving}
                        aria-label="Add label"
                      >
                        <PlusIcon />
                      </button>
                    )}
                  </div>
                  {labelsState.length > 0 ? (
                    <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
                      {labelsState.map((label, index) => (
                        <div key={`label-${index}`}>
                          {isEditing ? (
                            <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-2">
                              <input
                                id={`label-color-${index}`}
                                type="color"
                                value={label.color || '#0f172a'}
                                onChange={(event) =>
                                  updateLabelField(index, 'color', event.target.value)
                                }
                                className="h-8 w-8 cursor-pointer rounded border-0"
                                disabled={isSaving}
                                aria-label={`Label ${index + 1} color`}
                              />
                              <input
                                id={`label-text-${index}`}
                                type="text"
                                value={label.text || ''}
                                onChange={(event) =>
                                  updateLabelField(index, 'text', event.target.value)
                                }
                                placeholder="Label text"
                                className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-xs"
                                disabled={isSaving}
                                aria-label={`Label ${index + 1} text`}
                              />
                              <button
                                type="button"
                                onClick={() => removeLabel(index)}
                                className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
                                disabled={isSaving}
                              >
                                <TrashIcon />
                              </button>
                            </div>
                          ) : (
                            <span
                              className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-white shadow-sm"
                              style={{ backgroundColor: label.color || '#334155' }}
                            >
                              {label.text || 'Label'}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-slate-400">No labels</p>
                  )}
                </section>

                {/* Assigned Members */}
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center gap-2 text-slate-700">
                    <UsersIcon />
                    <h3 className="text-sm font-semibold">Assigned</h3>
                  </div>
                  {isEditing ? (
                    boardMembers.length > 0 ? (
                      <ul className="max-h-40 space-y-2 overflow-y-auto pr-1">
                        {boardMembers.map((member) => (
                          <li key={member.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id={`assignee-${member.id}`}
                              checked={assignedState.includes(member.id)}
                              onChange={() => toggleAssignedMember(member.id)}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              disabled={isSaving}
                            />
                            <label
                              htmlFor={`assignee-${member.id}`}
                              className="text-sm text-slate-700"
                            >
                              {member.displayName ?? resolveMemberLabel(member.id)}
                            </label>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-center text-sm text-slate-400">No board members</p>
                    )
                  ) : assignedMembers.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {assignedMembers.map((member) => (
                        <div
                          key={member.id}
                          className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1"
                        >
                          <UserAvatar
                            user={{
                              id: member.id,
                              username: member.label || 'Unknown',
                            }}
                            size="xs"
                            showTooltip={false}
                          />
                          <span className="text-xs font-medium text-slate-700">{member.label}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-sm text-slate-400">No one assigned</p>
                  )}
                </section>

                {/* Danger Zone - only shown if user can edit */}
                {!readOnly && (
                  <section className="rounded-xl border border-rose-200 bg-rose-50/50 p-4">
                    <h3 className="mb-3 text-sm font-semibold text-rose-700">Danger zone</h3>
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={isDeleting}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 disabled:opacity-70"
                    >
                      <TrashIcon />
                      {isDeleting ? 'Deleting…' : 'Delete card'}
                    </button>
                    {deleteError && <p className="mt-2 text-xs text-rose-600">{deleteError}</p>}
                  </section>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const memberShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  role: PropTypes.string,
  displayName: PropTypes.string,
});

const labelShape = PropTypes.shape({
  color: PropTypes.string,
  text: PropTypes.string,
});

const checklistItemShape = PropTypes.shape({
  text: PropTypes.string,
  completed: PropTypes.bool,
});

const commentShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  author: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  text: PropTypes.string,
  createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
});

const activityShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  actor: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  message: PropTypes.string,
  createdAt: PropTypes.oneOfType([PropTypes.string, PropTypes.number, PropTypes.instanceOf(Date)]),
});

CardDetailModal.propTypes = {
  card: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    dueDate: PropTypes.string,
    labels: PropTypes.arrayOf(labelShape),
    assignedMembers: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.string, PropTypes.number])),
    checklist: PropTypes.arrayOf(checklistItemShape),
    comments: PropTypes.arrayOf(commentShape),
    activity: PropTypes.arrayOf(activityShape),
  }).isRequired,
  boardMembers: PropTypes.arrayOf(memberShape),
  onClose: PropTypes.func.isRequired,
  onUpdateCard: PropTypes.func.isRequired,
  isSaving: PropTypes.bool,
  updateError: PropTypes.string,
  onDelete: PropTypes.func.isRequired,
  isDeleting: PropTypes.bool,
  deleteError: PropTypes.string,
  readOnly: PropTypes.bool,
};

export default CardDetailModal;

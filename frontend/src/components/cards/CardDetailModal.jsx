import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-slate-900/70"
        aria-label="Close card details"
        onClick={onClose}
        tabIndex={-1}
      />
      <div
        className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <form onSubmit={handleSaveAll} className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Card details
              </p>
              {isEditing ? (
                <>
                  <label htmlFor="card-title-input" className="sr-only">
                    Card title
                  </label>
                  <input
                    id="card-title-input"
                    value={titleValue}
                    onChange={(event) => setTitleValue(event.target.value)}
                    aria-label="Card title"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-lg font-semibold text-slate-900 focus:border-blue-500 focus:outline-none"
                    disabled={isSaving}
                  />
                </>
              ) : (
                <h2 className="text-2xl font-semibold text-slate-900">{card.title}</h2>
              )}
              {updateError && <p className="text-xs text-rose-600">{updateError}</p>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="submit"
                    className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium disabled:opacity-70"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Saving…' : 'Save changes'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={beginEditing}
                  className="inline-flex items-center rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Edit details
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-slate-200 px-3 py-1 text-xl text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ×
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={isDeleting}
                className="inline-flex items-center rounded-md border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 disabled:opacity-70"
              >
                {isDeleting ? 'Deleting…' : 'Delete card'}
              </button>
            </div>
          </div>
          {deleteError && <p className="text-xs text-rose-600">{deleteError}</p>}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700">Description</h3>
            {isEditing ? (
              <>
                <label htmlFor="card-description" className="sr-only">
                  Card description
                </label>
                <textarea
                  id="card-description"
                  value={descriptionValue}
                  onChange={(event) => setDescriptionValue(event.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Add details for this card"
                  aria-label="Card description"
                  disabled={isSaving}
                />
              </>
            ) : (
              <p className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700">
                {descriptionValue || 'No description provided.'}
              </p>
            )}
          </section>

          <div className="grid gap-6 md:grid-cols-2">
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Due date</h3>
                {isEditing && (
                  <button
                    type="button"
                    onClick={() => setDueDateValue('')}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
                    disabled={isSaving}
                  >
                    Clear due date
                  </button>
                )}
              </div>
              {isEditing ? (
                <>
                  <label htmlFor="card-due-date" className="sr-only">
                    Due date
                  </label>
                  <input
                    id="card-due-date"
                    type="datetime-local"
                    value={dueDateValue}
                    onChange={(event) => setDueDateValue(event.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
                    aria-label="Card due date"
                    disabled={isSaving}
                  />
                </>
              ) : (
                <p className="rounded-lg border border-slate-100 px-3 py-2 text-sm text-slate-700">
                  {dueDateLabel}
                </p>
              )}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">Labels</h3>
                {isEditing && (
                  <button
                    type="button"
                    onClick={addLabel}
                    className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-600"
                    disabled={isSaving}
                  >
                    Add label
                  </button>
                )}
              </div>
              {labelsState.length > 0 ? (
                <ul className="space-y-2">
                  {labelsState.map((label, index) => (
                    <li key={`label-${index}`} className="rounded-lg border border-slate-200 p-2">
                      {isEditing ? (
                        <div className="flex flex-wrap gap-2">
                          <label htmlFor={`label-color-${index}`} className="sr-only">
                            Label {index + 1} color
                          </label>
                          <input
                            id={`label-color-${index}`}
                            type="color"
                            value={label.color || '#0f172a'}
                            onChange={(event) =>
                              updateLabelField(index, 'color', event.target.value)
                            }
                            className="h-10 w-10 rounded"
                            aria-label="Label color"
                            disabled={isSaving}
                          />
                          <label htmlFor={`label-text-${index}`} className="sr-only">
                            Label {index + 1} text
                          </label>
                          <input
                            id={`label-text-${index}`}
                            type="text"
                            value={label.text || ''}
                            onChange={(event) =>
                              updateLabelField(index, 'text', event.target.value)
                            }
                            placeholder="Label text"
                            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
                            aria-label={`Label ${index + 1} text`}
                            disabled={isSaving}
                          />
                          <button
                            type="button"
                            onClick={() => removeLabel(index)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <span
                          className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-white"
                          style={{ backgroundColor: label.color || '#334155' }}
                        >
                          {label.text || 'Label'}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No labels yet.</p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Assigned members</h3>
              {isEditing ? (
                boardMembers.length > 0 ? (
                  <ul className="space-y-2">
                    {boardMembers.map((member) => (
                      <li
                        key={member.id}
                        className="flex items-center gap-2 text-sm text-slate-700"
                      >
                        <input
                          type="checkbox"
                          id={`assignee-${member.id}`}
                          checked={assignedState.includes(member.id)}
                          onChange={() => toggleAssignedMember(member.id)}
                          aria-label={`Assign ${member.displayName ?? resolveMemberLabel(member.id)}`}
                          disabled={isSaving}
                        />
                        <label htmlFor={`assignee-${member.id}`} className="flex-1">
                          {member.displayName ?? resolveMemberLabel(member.id)}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">No board members available.</p>
                )
              ) : assignedMembers.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {assignedMembers.map((member) => (
                    <span
                      key={member.id}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
                    >
                      {member.label}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No members assigned.</p>
              )}
            </section>

            <section className="space-y-3 md:col-span-2">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <h3 className="text-sm font-semibold text-slate-700">Checklist</h3>
                  <p className="text-xs text-slate-500">
                    {checklistStats.completed}/{checklistStats.total} completed
                  </p>
                </div>
                {isEditing && (
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="rounded-md border border-slate-300 px-3 py-1 text-xs text-slate-600"
                    disabled={isSaving}
                  >
                    Add item
                  </button>
                )}
              </div>
              {checklistState.length > 0 ? (
                <ul className="space-y-2">
                  {checklistState.map((item, index) => (
                    <li
                      key={`checklist-${index}`}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      {isEditing ? (
                        <>
                          <input
                            type="checkbox"
                            checked={Boolean(item.completed)}
                            onChange={() => toggleChecklistCompletion(index)}
                            aria-label={`Toggle checklist item ${index + 1}`}
                            disabled={isSaving}
                          />
                          <label htmlFor={`checklist-text-${index}`} className="sr-only">
                            Checklist item {index + 1}
                          </label>
                          <input
                            id={`checklist-text-${index}`}
                            type="text"
                            value={item.text}
                            onChange={(event) =>
                              updateChecklistItem(index, 'text', event.target.value)
                            }
                            className="flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-700"
                            placeholder="Checklist item"
                            aria-label={`Checklist item ${index + 1}`}
                            disabled={isSaving}
                          />
                          <button
                            type="button"
                            onClick={() => removeChecklistItem(index)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600"
                            disabled={isSaving}
                          >
                            Remove
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-1 items-center justify-between">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" checked={Boolean(item.completed)} readOnly />
                            <span className="text-sm text-slate-700">
                              {item.text || 'Untitled item'}
                            </span>
                          </div>
                          {Boolean(item.completed) && (
                            <span className="text-xs font-semibold text-emerald-600">Done</span>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No checklist items yet.</p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Comments</h3>
              {comments.length > 0 ? (
                <ul className="space-y-3">
                  {comments.map((comment) => (
                    <li key={comment.id} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        {resolveMemberLabel(comment.author)} ·{' '}
                        {formatDateTime(comment.createdAt) || 'Unknown time'}
                      </p>
                      <p className="text-sm text-slate-700">{comment.text}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No comments yet.</p>
              )}
            </section>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700">Activity</h3>
              {activity.length > 0 ? (
                <ul className="space-y-2">
                  {activity.map((entry) => (
                    <li key={entry.id} className="rounded-lg border border-slate-100 p-3">
                      <p className="text-xs font-semibold text-slate-500">
                        {resolveMemberLabel(entry.actor)} ·{' '}
                        {formatDateTime(entry.createdAt) || 'Unknown time'}
                      </p>
                      <p className="text-sm text-slate-700">{entry.message}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-400">No activity yet.</p>
              )}
            </section>
          </div>
        </form>
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
};

export default CardDetailModal;

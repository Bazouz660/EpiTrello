import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { fetchBoardById, selectBoards } from '../features/boards/boardsSlice.js';
import {
  createCard,
  deleteCard,
  fetchCardsByList,
  selectCards,
  updateCard,
} from '../features/cards/cardsSlice.js';
import {
  createList,
  deleteList,
  fetchListsByBoard,
  selectLists,
  updateList,
} from '../features/lists/listsSlice.js';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';

const emptyListEditor = { id: null, title: '' };
const emptyCardEditor = { id: null, listId: null, title: '', description: '' };

const BoardViewPage = () => {
  const { boardId } = useParams();
  const dispatch = useAppDispatch();
  const boardsState = useAppSelector(selectBoards);
  const listsState = useAppSelector(selectLists);
  const cardsState = useAppSelector(selectCards);

  const [newListTitle, setNewListTitle] = useState('');
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listEditor, setListEditor] = useState(emptyListEditor);
  const [newCardDrafts, setNewCardDrafts] = useState({});
  const [cardEditor, setCardEditor] = useState(emptyCardEditor);

  const closeCreateListModal = () => {
    setIsListModalOpen(false);
    setNewListTitle('');
  };

  const board = boardsState.selectedBoard?.id === boardId ? boardsState.selectedBoard : null;
  const boardError =
    boardsState.selectedStatus === 'failed' && boardsState.selectedError
      ? boardsState.selectedError
      : null;
  const showBoardLoading =
    !board && (boardsState.selectedStatus === 'idle' || boardsState.selectedStatus === 'loading');

  const listsStatus = listsState.fetchStatusByBoard[boardId] ?? 'idle';
  const listsError = listsState.fetchErrorByBoard[boardId] ?? null;
  const lists = useMemo(
    () =>
      (listsState.idsByBoard[boardId] ?? []).map((id) => listsState.entities[id]).filter(Boolean),
    [boardId, listsState.entities, listsState.idsByBoard],
  );

  const cardsByList = useMemo(() => {
    const result = {};
    lists.forEach((list) => {
      result[list.id] = (cardsState.idsByList[list.id] ?? [])
        .map((cardId) => cardsState.entities[cardId])
        .filter(Boolean);
    });
    return result;
  }, [cardsState.entities, cardsState.idsByList, lists]);

  useEffect(() => {
    dispatch(fetchBoardById({ id: boardId }));
  }, [dispatch, boardId]);

  useEffect(() => {
    if (listsStatus === 'idle') {
      dispatch(fetchListsByBoard({ boardId }));
    }
  }, [dispatch, boardId, listsStatus]);

  useEffect(() => {
    lists.forEach((list) => {
      const status = cardsState.fetchStatusByList[list.id] ?? 'idle';
      if (status === 'idle') {
        dispatch(fetchCardsByList({ listId: list.id }));
      }
    });
  }, [dispatch, lists, cardsState.fetchStatusByList]);

  useEffect(() => {
    if (!isListModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCreateListModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isListModalOpen]);

  const handleCreateList = async (event) => {
    event.preventDefault();
    const title = newListTitle.trim();
    if (!title) return;
    try {
      await dispatch(createList({ board: boardId, title })).unwrap();
      closeCreateListModal();
    } catch {
      // error handled via slice state
    }
  };

  const startEditingList = (list) => {
    setListEditor({ id: list.id, title: list.title });
  };

  const cancelListEdit = () => {
    setListEditor(emptyListEditor);
  };

  const handleUpdateList = async (event) => {
    event.preventDefault();
    if (!listEditor.id) return;
    const title = listEditor.title.trim();
    if (!title) return;
    try {
      await dispatch(updateList({ id: listEditor.id, changes: { title } })).unwrap();
      cancelListEdit();
    } catch {
      // surfaced through slice
    }
  };

  const handleDeleteList = async (listId) => {
    const confirmed = window.confirm('Delete this list and all of its cards?');
    if (!confirmed) return;
    try {
      await dispatch(deleteList({ id: listId })).unwrap();
    } catch {
      // surfaced via slice
    }
  };

  const getNewCardDraft = (listId) => newCardDrafts[listId] ?? { title: '', description: '' };

  const handleDraftChange = (listId, field, value) => {
    setNewCardDrafts((prev) => ({
      ...prev,
      [listId]: { ...getNewCardDraft(listId), [field]: value },
    }));
  };

  const handleCreateCard = async (event, listId) => {
    event.preventDefault();
    const draft = getNewCardDraft(listId);
    const title = draft.title.trim();
    if (!title) return;
    try {
      await dispatch(
        createCard({
          list: listId,
          title,
          description: draft.description.trim(),
        }),
      ).unwrap();
      setNewCardDrafts((prev) => ({
        ...prev,
        [listId]: { title: '', description: '' },
      }));
    } catch {
      // error shown via slice
    }
  };

  const startEditingCard = (card) => {
    setCardEditor({
      id: card.id,
      listId: card.list,
      title: card.title,
      description: card.description ?? '',
    });
  };

  const cancelCardEdit = () => {
    setCardEditor(emptyCardEditor);
  };

  const handleUpdateCard = async (event) => {
    event.preventDefault();
    if (!cardEditor.id) return;
    const title = cardEditor.title.trim();
    if (!title) return;
    try {
      await dispatch(
        updateCard({
          id: cardEditor.id,
          changes: {
            title,
            description: cardEditor.description.trim(),
          },
        }),
      ).unwrap();
      cancelCardEdit();
    } catch {
      // handled in slice
    }
  };

  const handleDeleteCard = async (cardId) => {
    const confirmed = window.confirm('Delete this card?');
    if (!confirmed) return;
    try {
      await dispatch(deleteCard({ id: cardId })).unwrap();
    } catch {
      // surfaced via slice
    }
  };

  if (showBoardLoading) {
    return (
      <section className="space-y-4">
        <Link to="/boards" className="text-sm text-blue-600 hover:underline">
          ← Back to boards
        </Link>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Loading board…
        </div>
      </section>
    );
  }

  if (boardError) {
    return (
      <section className="space-y-4">
        <Link to="/boards" className="text-sm text-blue-600 hover:underline">
          ← Back to boards
        </Link>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          {boardError}
        </div>
      </section>
    );
  }

  if (!board) {
    return null;
  }

  return (
    <section className="flex min-h-[calc(100vh-120px)] flex-col gap-6">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{board.title}</h1>
          {board.description && <p className="text-sm text-slate-600">{board.description}</p>}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setIsListModalOpen(true)}
            className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600"
          >
            Add list
          </button>
          <Link
            to="/boards"
            className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
          >
            Back to boards
          </Link>
        </div>
      </div>

      {listsError && (
        <div className="mx-auto w-full max-w-6xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {listsError}
        </div>
      )}

      <div className="flex-1 overflow-hidden rounded-2xl bg-slate-100/70 p-4">
        <div className="h-full min-h-[320px] overflow-x-auto pb-4">
          <div className="flex h-full min-h-[calc(100vh-220px)] items-start gap-4">
            {listsStatus === 'loading' && lists.length === 0 && (
              <div className="flex min-h-[200px] min-w-[280px] items-center justify-center rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
                Loading lists…
              </div>
            )}
            {lists.length === 0 && listsStatus === 'succeeded' && (
              <div className="flex min-h-[200px] min-w-[280px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                This board does not have any lists yet.
              </div>
            )}
            {lists.map((list) => {
              const isEditing = listEditor.id === list.id;
              const cards = cardsByList[list.id] ?? [];
              const cardsStatus = cardsState.fetchStatusByList[list.id] ?? 'idle';
              const cardsError = cardsState.fetchErrorByList[list.id] ?? null;
              const draft = getNewCardDraft(list.id);
              const isDeletingList =
                listsState.deleteStatus === 'loading' && listsState.deletingId === list.id;
              const isUpdatingList =
                listsState.updateStatus === 'loading' && listsState.updatingId === list.id;
              const creatingCard =
                cardsState.createStatus === 'loading' && cardsState.creatingListId === list.id;

              return (
                <div
                  key={list.id}
                  className="flex h-full w-72 min-w-[18rem] flex-shrink-0 flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    {isEditing ? (
                      <form onSubmit={handleUpdateList} className="flex-1 space-y-2">
                        <label htmlFor={`edit-list-${list.id}`} className="sr-only">
                          Edit list title
                        </label>
                        <input
                          id={`edit-list-${list.id}`}
                          value={listEditor.title}
                          onChange={(event) =>
                            setListEditor((prev) => ({ ...prev, title: event.target.value }))
                          }
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                        />
                        {listsState.updateError && listsState.updatingId === list.id && (
                          <p className="text-xs text-red-600">{listsState.updateError}</p>
                        )}
                        <div className="flex gap-2 text-xs">
                          <button
                            type="submit"
                            disabled={isUpdatingList}
                            className="bg-primary text-primary-foreground inline-flex flex-1 items-center justify-center rounded-md px-2 py-1 font-medium disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {isUpdatingList ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            onClick={cancelListEdit}
                            className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-slate-900">{list.title}</h3>
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => startEditingList(list)}
                            className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteList(list.id)}
                            disabled={isDeletingList}
                            className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-75"
                          >
                            {isDeletingList ? 'Deleting…' : 'Delete'}
                          </button>
                        </div>
                        {listsState.deleteError && listsState.deletingId === list.id && (
                          <p className="mt-2 text-xs text-red-600">{listsState.deleteError}</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                    {cardsStatus === 'loading' && cards.length === 0 && (
                      <p className="text-sm text-slate-500">Loading cards…</p>
                    )}
                    {cardsError && <p className="text-xs text-red-600">{cardsError}</p>}
                    {cards.map((card) => {
                      const isEditingCard = cardEditor.id === card.id;
                      const isDeletingCard =
                        cardsState.deleteStatus === 'loading' && cardsState.deletingId === card.id;
                      const isUpdatingCard =
                        cardsState.updateStatus === 'loading' && cardsState.updatingId === card.id;

                      if (isEditingCard) {
                        return (
                          <form
                            key={card.id}
                            onSubmit={handleUpdateCard}
                            className="space-y-2 rounded-md border border-blue-100 bg-blue-50 p-2"
                          >
                            <label htmlFor={`edit-card-title-${card.id}`} className="sr-only">
                              Edit card title
                            </label>
                            <input
                              id={`edit-card-title-${card.id}`}
                              value={cardEditor.title}
                              onChange={(event) =>
                                setCardEditor((prev) => ({ ...prev, title: event.target.value }))
                              }
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                            <label htmlFor={`edit-card-description-${card.id}`} className="sr-only">
                              Edit card description
                            </label>
                            <textarea
                              id={`edit-card-description-${card.id}`}
                              value={cardEditor.description}
                              onChange={(event) =>
                                setCardEditor((prev) => ({
                                  ...prev,
                                  description: event.target.value,
                                }))
                              }
                              rows={3}
                              className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                            />
                            {cardsState.updateError && cardsState.updatingId === card.id && (
                              <p className="text-xs text-red-600">{cardsState.updateError}</p>
                            )}
                            <div className="flex gap-2 text-xs">
                              <button
                                type="submit"
                                disabled={isUpdatingCard}
                                className="bg-primary text-primary-foreground inline-flex flex-1 items-center justify-center rounded-md px-2 py-1 font-medium disabled:cursor-not-allowed disabled:opacity-70"
                              >
                                {isUpdatingCard ? 'Saving…' : 'Save'}
                              </button>
                              <button
                                type="button"
                                onClick={cancelCardEdit}
                                className="inline-flex flex-1 items-center justify-center rounded-md border border-slate-300 px-2 py-1 font-medium text-slate-700"
                              >
                                Cancel
                              </button>
                            </div>
                          </form>
                        );
                      }

                      return (
                        <div
                          key={card.id}
                          className="space-y-2 rounded-md border border-slate-200 p-2"
                        >
                          <div>
                            <h4 className="text-sm font-medium text-slate-900">{card.title}</h4>
                            {card.description && (
                              <p className="text-xs text-slate-600">{card.description}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => startEditingCard(card)}
                              className="inline-flex items-center rounded-md border border-slate-200 px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCard(card.id)}
                              disabled={isDeletingCard}
                              className="inline-flex items-center rounded-md border border-red-200 px-2 py-1 font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isDeletingCard ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                          {cardsState.deleteError && cardsState.deletingId === card.id && (
                            <p className="text-xs text-red-600">{cardsState.deleteError}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <form
                    onSubmit={(event) => handleCreateCard(event, list.id)}
                    className="mt-4 space-y-2"
                  >
                    <div className="space-y-1">
                      <label
                        htmlFor={`new-card-title-${list.id}`}
                        className="text-xs font-medium text-slate-600"
                      >
                        Card title
                      </label>
                      <input
                        id={`new-card-title-${list.id}`}
                        value={draft.title}
                        onChange={(event) =>
                          handleDraftChange(list.id, 'title', event.target.value)
                        }
                        placeholder="Task name"
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label
                        htmlFor={`new-card-description-${list.id}`}
                        className="text-xs font-medium text-slate-600"
                      >
                        Description
                      </label>
                      <textarea
                        id={`new-card-description-${list.id}`}
                        value={draft.description}
                        onChange={(event) =>
                          handleDraftChange(list.id, 'description', event.target.value)
                        }
                        rows={2}
                        className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    {cardsState.createError && cardsState.creatingListId === list.id && (
                      <p className="text-xs text-red-600">{cardsState.createError}</p>
                    )}
                    <button
                      type="submit"
                      disabled={creatingCard}
                      className="bg-primary text-primary-foreground inline-flex w-full items-center justify-center rounded-md px-2 py-1 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {creatingCard ? 'Adding…' : 'Add card'}
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {isListModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-slate-900/60"
            aria-label="Close list creation modal"
            onClick={closeCreateListModal}
            tabIndex={-1}
          />
          <div
            className="relative z-10 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Create list</h2>
                <p className="text-sm text-slate-600">Give your new list a descriptive title.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateListModal}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateList} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="new-list-title" className="text-sm font-medium text-slate-700">
                  List title
                </label>
                <input
                  id="new-list-title"
                  value={newListTitle}
                  onChange={(event) => setNewListTitle(event.target.value)}
                  placeholder="e.g. In progress"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              {listsState.createError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {listsState.createError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateListModal}
                  className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={listsState.createStatus === 'loading'}
                  className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {listsState.createStatus === 'loading' ? 'Creating…' : 'Create list'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default BoardViewPage;

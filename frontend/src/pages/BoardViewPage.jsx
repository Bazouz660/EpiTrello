import { useEffect, useMemo, useRef, useState } from 'react';
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
const emptyCardModalState = {
  mode: null,
  id: null,
  listId: null,
  title: '',
  description: '',
};
const defaultBoardTheme = { type: 'color', value: '#0f172a', thumbnail: '' };

const buildBoardBackgroundStyle = (background) => {
  if (!background) {
    return { backgroundColor: defaultBoardTheme.value };
  }
  if (background.type === 'image') {
    return {
      backgroundImage: `url(${background.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundRepeat: 'no-repeat',
    };
  }
  return { backgroundColor: background.value };
};

const BoardViewPage = () => {
  const { boardId } = useParams();
  const dispatch = useAppDispatch();
  const boardsState = useAppSelector(selectBoards);
  const listsState = useAppSelector(selectLists);
  const cardsState = useAppSelector(selectCards);

  const [newListTitle, setNewListTitle] = useState('');
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listEditor, setListEditor] = useState(emptyListEditor);
  const [cardModal, setCardModal] = useState(emptyCardModalState);
  const [cardModalError, setCardModalError] = useState(null);
  const listTitleInputRef = useRef(null);

  const closeCreateListModal = () => {
    setIsListModalOpen(false);
    setNewListTitle('');
  };

  const closeCardModal = () => {
    setCardModal(emptyCardModalState);
    setCardModalError(null);
  };

  const isCardModalOpen = cardModal.mode !== null;

  const board = boardsState.selectedBoard?.id === boardId ? boardsState.selectedBoard : null;
  const boardBackgroundStyle = useMemo(
    () => buildBoardBackgroundStyle(board?.background ?? defaultBoardTheme),
    [board?.background?.type, board?.background?.value, board?.background?.thumbnail],
  );
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

  useEffect(() => {
    if (!isCardModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCardModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCardModalOpen]);

  useEffect(() => {
    if (!listEditor.id) return;
    const input = listTitleInputRef.current;
    if (input) {
      input.focus();
      input.select();
    }
  }, [listEditor.id]);

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

  const handleListTitleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelListEdit();
    }
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

  const openCreateCardModal = (listId) => {
    setCardModal({ mode: 'create', id: null, listId, title: '', description: '' });
    setCardModalError(null);
  };

  const openEditCardModal = (card) => {
    setCardModal({
      mode: 'edit',
      id: card.id,
      listId: card.list,
      title: card.title,
      description: card.description ?? '',
    });
    setCardModalError(null);
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

  const handleCardModalSubmit = async (event) => {
    event.preventDefault();
    if (!isCardModalOpen) return;
    const title = cardModal.title.trim();
    if (!title) return;
    setCardModalError(null);
    try {
      if (cardModal.mode === 'create') {
        await dispatch(
          createCard({
            list: cardModal.listId,
            title,
            description: cardModal.description.trim(),
          }),
        ).unwrap();
      } else if (cardModal.mode === 'edit' && cardModal.id) {
        await dispatch(
          updateCard({
            id: cardModal.id,
            changes: {
              title,
              description: cardModal.description.trim(),
            },
          }),
        ).unwrap();
      }
      closeCardModal();
    } catch (error) {
      setCardModalError(
        typeof error === 'string' ? error : 'Unable to save card. Please try again.',
      );
    }
  };

  if (showBoardLoading) {
    return (
      <section className="space-y-4">
        <Link to="/boards" className="text-sm text-blue-600 hover:underline">
          ← Back to boards
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-1/3 rounded bg-slate-200" />
            <div className="h-4 w-2/5 rounded bg-slate-200" />
            <div className="flex gap-3">
              <div className="h-32 flex-1 rounded-lg bg-slate-100" />
              <div className="h-32 flex-1 rounded-lg bg-slate-100" />
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!board) {
    return (
      <section className="space-y-4">
        <Link to="/boards" className="text-sm text-blue-600 hover:underline">
          ← Back to boards
        </Link>
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-red-600">
          {boardError ??
            'This board could not be loaded. Try refreshing or return to the boards list.'}
        </div>
      </section>
    );
  }

  const membershipRole = board.membershipRole ?? 'owner';
  const isOwner = membershipRole === 'owner';

  const cardModalTitle =
    cardModal.mode === 'edit' ? 'Edit card' : cardModal.mode === 'create' ? 'Add card' : '';

  const cardModalDescription =
    cardModal.mode === 'edit'
      ? 'Update the details for this card.'
      : 'Enter a title to create a new card in this list.';

  const cardModalPrimaryLabel = cardModal.mode === 'edit' ? 'Save changes' : 'Create card';

  const isSubmittingCard =
    cardModal.mode === 'create'
      ? cardsState.createStatus === 'loading' && cardsState.creatingListId === cardModal.listId
      : cardModal.mode === 'edit'
        ? cardsState.updateStatus === 'loading' && cardsState.updatingId === cardModal.id
        : false;

  return (
    <section
      className="relative -mx-6 -my-8 min-h-[calc(100vh-120px)] overflow-hidden"
      style={boardBackgroundStyle}
    >
      <div className="absolute inset-0 bg-slate-900/60" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[calc(100vh-120px)] flex-col gap-6 p-6">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 text-white">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-200">
              {isOwner ? 'Owned board' : `Shared · ${membershipRole}`}
            </p>
            <h1 className="text-3xl font-semibold text-white">{board.title}</h1>
            {board.description && <p className="text-sm text-slate-100">{board.description}</p>}
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setIsListModalOpen(true)}
              className="inline-flex items-center rounded-md border border-white/30 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur hover:bg-white/20"
            >
              Add list
            </button>
            <Link
              to="/boards"
              className="inline-flex items-center rounded-md border border-white/30 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
            >
              Back to boards
            </Link>
          </div>
        </div>

        {listsError && (
          <div className="mx-auto w-full max-w-6xl rounded-lg border border-red-200 bg-red-50/90 p-4 text-sm text-red-700">
            {listsError}
          </div>
        )}

        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex h-full min-h-[calc(100vh-220px)] items-start gap-4">
            {listsStatus === 'loading' && lists.length === 0 && (
              <div className="flex min-h-[200px] min-w-[280px] items-center justify-center rounded-lg border border-white/30 bg-white/10 p-6 text-sm text-white/80">
                Loading lists…
              </div>
            )}
            {lists.length === 0 && listsStatus === 'succeeded' && (
              <div className="flex min-h-[200px] min-w-[280px] items-center justify-center rounded-lg border border-dashed border-white/40 bg-white/5 p-6 text-sm text-white/80">
                This board does not have any lists yet.
              </div>
            )}
            {lists.map((list) => {
              const isEditing = listEditor.id === list.id;
              const cards = cardsByList[list.id] ?? [];
              const cardsStatus = cardsState.fetchStatusByList[list.id] ?? 'idle';
              const cardsError = cardsState.fetchErrorByList[list.id] ?? null;
              const isDeletingList =
                listsState.deleteStatus === 'loading' && listsState.deletingId === list.id;
              const isUpdatingList =
                listsState.updateStatus === 'loading' && listsState.updatingId === list.id;

              return (
                <div
                  key={list.id}
                  className="flex h-full w-72 min-w-[18rem] flex-shrink-0 flex-col rounded-xl border border-white/40 bg-transparent p-4 text-white shadow-[0_15px_40px_rgba(15,23,42,0.35)] backdrop-blur-sm"
                >
                  <div className="mb-3 flex items-start gap-2">
                    <div className="flex-1">
                      {isEditing ? (
                        <form onSubmit={handleUpdateList} className="flex flex-col gap-2">
                          <label htmlFor={`edit-list-${list.id}`} className="sr-only">
                            Edit list title
                          </label>
                          <input
                            id={`edit-list-${list.id}`}
                            ref={listTitleInputRef}
                            value={listEditor.title}
                            onChange={(event) =>
                              setListEditor((prev) => ({ ...prev, title: event.target.value }))
                            }
                            onKeyDown={handleListTitleKeyDown}
                            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 focus:border-blue-500 focus:outline-none"
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
                        <button
                          type="button"
                          onClick={() => startEditingList(list)}
                          className="group w-full rounded-md border border-transparent px-2 py-1 text-left text-white transition hover:border-white/30 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                        >
                          <span className="block text-base font-semibold">{list.title}</span>
                          <span className="text-[11px] font-medium uppercase tracking-wide text-white/70 opacity-0 transition group-hover:opacity-100">
                            Click to rename
                          </span>
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteList(list.id)}
                      disabled={isDeletingList}
                      className="inline-flex items-center rounded-md border border-rose-200/60 px-2 py-1 text-xs font-medium text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-75"
                    >
                      {isDeletingList ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                  {listsState.deleteError && listsState.deletingId === list.id && (
                    <p className="-mt-2 mb-2 text-xs text-rose-200">{listsState.deleteError}</p>
                  )}

                  <div className="flex-1 space-y-2 overflow-y-auto pr-1">
                    {cardsStatus === 'loading' && cards.length === 0 && (
                      <p className="text-sm text-white/80">Loading cards…</p>
                    )}
                    {cardsError && <p className="text-xs text-rose-200">{cardsError}</p>}
                    {cards.map((card) => {
                      const isDeletingCard =
                        cardsState.deleteStatus === 'loading' && cardsState.deletingId === card.id;

                      return (
                        <div
                          key={card.id}
                          className="space-y-2 rounded-md border border-white/30 p-2"
                        >
                          <div>
                            <h4 className="text-sm font-medium text-white">{card.title}</h4>
                            {card.description && (
                              <p className="text-xs text-white/80">{card.description}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            <button
                              type="button"
                              onClick={() => openEditCardModal(card)}
                              className="inline-flex items-center rounded-md border border-white/30 px-2 py-1 font-medium text-white hover:bg-white/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCard(card.id)}
                              disabled={isDeletingCard}
                              className="inline-flex items-center rounded-md border border-rose-200/60 px-2 py-1 font-medium text-rose-200 hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-70"
                            >
                              {isDeletingCard ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                          {cardsState.deleteError && cardsState.deletingId === card.id && (
                            <p className="text-xs text-rose-200">{cardsState.deleteError}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => openCreateCardModal(list.id)}
                      className="inline-flex w-full items-center justify-center rounded-md border border-dashed border-white/40 px-3 py-2 text-sm font-medium text-white/90 hover:bg-white/10"
                    >
                      + Add card
                    </button>
                  </div>
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

      {isCardModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-slate-900/70"
            aria-label="Close card modal"
            onClick={closeCardModal}
            tabIndex={-1}
          />
          <div
            className="relative z-10 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{cardModalTitle}</h2>
                <p className="text-sm text-slate-600">{cardModalDescription}</p>
              </div>
              <button
                type="button"
                onClick={closeCardModal}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCardModalSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="card-title" className="text-sm font-medium text-slate-700">
                  Title
                </label>
                <input
                  id="card-title"
                  value={cardModal.title}
                  onChange={(event) =>
                    setCardModal((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Enter a card title"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="card-description" className="text-sm font-medium text-slate-700">
                  Description
                </label>
                <textarea
                  id="card-description"
                  value={cardModal.description}
                  onChange={(event) =>
                    setCardModal((prev) => ({ ...prev, description: event.target.value }))
                  }
                  rows={3}
                  placeholder="Add more context (optional)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              {cardModalError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                  {cardModalError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCardModal}
                  className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCard}
                  className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmittingCard ? 'Saving…' : cardModalPrimaryLabel}
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

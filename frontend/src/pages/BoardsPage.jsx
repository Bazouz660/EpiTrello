import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { selectAuth } from '../features/auth/authSlice.js';
import {
  createBoard,
  deleteBoard,
  fetchBoards,
  selectBoards,
  updateBoard,
} from '../features/boards/boardsSlice.js';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';

const BoardsPage = () => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(selectAuth);
  const {
    items,
    status,
    error,
    createStatus,
    createError,
    updateStatus,
    updateError,
    updatingId,
    deleteStatus,
    deleteError,
    deletingId,
  } = useAppSelector(selectBoards);

  const [newBoard, setNewBoard] = useState({ title: '', description: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState({ title: '', description: '' });

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchBoards());
    }
  }, [dispatch, status]);

  const handleCreateBoard = async (event) => {
    event.preventDefault();
    const trimmedTitle = newBoard.title.trim();
    if (!trimmedTitle) return;

    try {
      await dispatch(
        createBoard({
          title: trimmedTitle,
          description: newBoard.description.trim(),
        }),
      ).unwrap();
      setNewBoard({ title: '', description: '' });
    } catch {
      // Error surfaced through slice state so swallow here.
    }
  };

  const startEditing = (board) => {
    setEditingId(board.id);
    setEditFields({ title: board.title, description: board.description ?? '' });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFields({ title: '', description: '' });
  };

  const handleUpdateBoard = async (event) => {
    event.preventDefault();
    if (!editingId) return;
    try {
      await dispatch(
        updateBoard({
          id: editingId,
          changes: {
            title: editFields.title.trim(),
            description: editFields.description.trim(),
          },
        }),
      ).unwrap();
      cancelEditing();
    } catch {
      // Handled by slice error state.
    }
  };

  const handleDeleteBoard = async (boardId) => {
    const confirmed = window.confirm('Delete this board? This action cannot be undone.');
    if (!confirmed) return;
    try {
      await dispatch(deleteBoard({ id: boardId })).unwrap();
    } catch {
      // Error surfaced via slice.
    }
  };

  const combinedError = error || createError || updateError || deleteError;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900">Boards</h1>
        <p className="text-sm text-slate-600">
          {user
            ? 'Create boards to map projects, track work, and keep your team aligned.'
            : 'Boards help you organize projects. Log in to create and manage them.'}
        </p>
      </header>

      <form
        onSubmit={handleCreateBoard}
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-medium text-slate-800">Create a new board</h2>
          <p className="text-sm text-slate-600">
            Give your board a descriptive title so collaborators immediately know its purpose.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="board-title" className="text-sm font-medium text-slate-700">
              Board title
            </label>
            <input
              id="board-title"
              name="title"
              type="text"
              value={newBoard.title}
              onChange={(event) => setNewBoard((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="e.g. Website redesign"
              required
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="board-description" className="text-sm font-medium text-slate-700">
              Description
            </label>
            <input
              id="board-description"
              name="description"
              type="text"
              value={newBoard.description}
              onChange={(event) =>
                setNewBoard((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Add optional context for teammates"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
        {createError && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>
        )}
        <button
          type="submit"
          disabled={createStatus === 'loading'}
          className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-75"
        >
          {createStatus === 'loading' ? 'Creating…' : 'Create board'}
        </button>
      </form>

      {combinedError && !createError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{combinedError}</p>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-800">Your boards</h2>
          {status === 'loading' && <span className="text-sm text-slate-500">Loading boards…</span>}
        </div>
        {items.length === 0 && status === 'succeeded' ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
            You do not have any boards yet. Create one to get started.
          </div>
        ) : (
          <div className="grid gap-4">
            {items.map((board) => {
              const isEditing = editingId === board.id;
              const isUpdating = updateStatus === 'loading' && updatingId === board.id;
              const isDeleting = deleteStatus === 'loading' && deletingId === board.id;

              return (
                <div
                  key={board.id}
                  className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
                >
                  {isEditing ? (
                    <form onSubmit={handleUpdateBoard} className="space-y-4">
                      <div className="space-y-2">
                        <label
                          htmlFor={`edit-title-${board.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Title
                        </label>
                        <input
                          id={`edit-title-${board.id}`}
                          name="title"
                          value={editFields.title}
                          onChange={(event) =>
                            setEditFields((prev) => ({ ...prev, title: event.target.value }))
                          }
                          required
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label
                          htmlFor={`edit-description-${board.id}`}
                          className="text-sm font-medium text-slate-700"
                        >
                          Description
                        </label>
                        <textarea
                          id={`edit-description-${board.id}`}
                          name="description"
                          value={editFields.description}
                          onChange={(event) =>
                            setEditFields((prev) => ({ ...prev, description: event.target.value }))
                          }
                          rows={3}
                          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      {updateError && updatingId === board.id && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                          {updateError}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={isUpdating}
                          className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-75"
                        >
                          {isUpdating ? 'Saving…' : 'Save changes'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelEditing}
                          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-xl font-semibold text-slate-900">{board.title}</h3>
                        {board.description && (
                          <p className="text-sm text-slate-600">{board.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <Link
                          to={`/boards/${board.id}`}
                          className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600"
                        >
                          Open board
                        </Link>
                        <button
                          type="button"
                          onClick={() => startEditing(board)}
                          className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBoard(board.id)}
                          disabled={isDeleting}
                          className="inline-flex items-center rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-75"
                        >
                          {isDeleting ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                      {deleteError && deletingId === board.id && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                          {deleteError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </section>
  );
};

export default BoardsPage;

import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import BoardCreateModal from '../components/boards/BoardCreateModal.jsx';
import BoardEditModal from '../components/boards/BoardEditModal.jsx';
import { selectAuth } from '../features/auth/authSlice.js';
import {
  createBoard,
  deleteBoard,
  fetchBoards,
  selectBoards,
  updateBoard,
} from '../features/boards/boardsSlice.js';
import { useAppDispatch, useAppSelector } from '../hooks/index.js';

const DEFAULT_BACKGROUND_COLOR = '#0f172a';

const getBackgroundPreviewStyle = (background) => {
  if (!background) return {};
  if (background.type === 'image') {
    return {
      backgroundImage: `url(${background.thumbnail || background.value})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  }
  return { backgroundColor: background.value };
};

const BoardsPage = () => {
  const navigate = useNavigate();
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

  const [editingBoard, setEditingBoard] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchBoards());
    }
  }, [dispatch, status]);

  const handleCreateBoard = async (boardData) => {
    try {
      const created = await dispatch(createBoard(boardData)).unwrap();
      setIsCreateModalOpen(false);
      navigate(`/boards/${created.id}`);
    } catch {
      // Error surfaced through slice state so swallow here.
    }
  };

  const startEditing = (board) => {
    setEditingBoard(board);
  };

  const cancelEditing = () => {
    setEditingBoard(null);
  };

  const handleUpdateBoard = async (changes) => {
    if (!editingBoard) return;
    try {
      await dispatch(
        updateBoard({
          id: editingBoard.id,
          changes,
        }),
      ).unwrap();
      cancelEditing();
    } catch {
      // Handled by slice error state.
    }
  };

  const handleDeleteBoard = async (boardId) => {
    try {
      await dispatch(deleteBoard({ id: boardId })).unwrap();
      cancelEditing();
    } catch {
      // Error surfaced via slice.
    }
  };

  const combinedError = error || updateError || deleteError;

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

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Create a new board</h2>
            <p className="text-sm text-slate-600">
              Launch the modal to name your board and pick the perfect background.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600"
          >
            Create board
          </button>
        </div>
      </div>

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
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((board) => {
              const isOwner = board.owner === user?.id;
              const boardBackground = board.background ?? {
                type: 'color',
                value: DEFAULT_BACKGROUND_COLOR,
              };

              return (
                <div
                  key={board.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="space-y-4">
                    <Link
                      to={`/boards/${board.id}`}
                      className="block overflow-hidden rounded-xl"
                      style={getBackgroundPreviewStyle(boardBackground)}
                    >
                      <div className="flex h-40 flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 text-white">
                        <p className="text-xs uppercase tracking-wide">
                          {isOwner ? 'Owned board' : `Shared · ${board.membershipRole ?? 'member'}`}
                        </p>
                        <h3 className="text-xl font-semibold">{board.title}</h3>
                        {board.description && (
                          <p className="text-sm text-slate-100">{board.description}</p>
                        )}
                      </div>
                    </Link>
                    <div className="flex items-center justify-between">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          isOwner ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {isOwner ? 'Owned' : `Shared · ${board.membershipRole ?? 'member'}`}
                      </span>
                      {isOwner && (
                        <button
                          type="button"
                          onClick={() => startEditing(board)}
                          className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {isCreateModalOpen && (
        <BoardCreateModal
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateBoard}
          isCreating={createStatus === 'loading'}
          createError={createError}
        />
      )}

      {editingBoard && (
        <BoardEditModal
          board={editingBoard}
          onClose={cancelEditing}
          onUpdate={handleUpdateBoard}
          isUpdating={updateStatus === 'loading' && updatingId === editingBoard.id}
          updateError={updatingId === editingBoard.id ? updateError : null}
          onDelete={() => handleDeleteBoard(editingBoard.id)}
          isDeleting={deleteStatus === 'loading' && deletingId === editingBoard.id}
          deleteError={deletingId === editingBoard.id ? deleteError : null}
        />
      )}
    </section>
  );
};

export default BoardsPage;

import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

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

const buildBackgroundPayload = ({ backgroundType, colorValue, imageData }) => {
  if (backgroundType === 'image' && imageData) {
    return { type: 'image', value: imageData, thumbnail: imageData };
  }
  return { type: 'color', value: colorValue || DEFAULT_BACKGROUND_COLOR };
};

const extractBackgroundFormState = (background) => {
  if (background?.type === 'image' && background.value) {
    return {
      backgroundType: 'image',
      colorValue: DEFAULT_BACKGROUND_COLOR,
      imageData: background.value,
      imageName: '',
    };
  }

  return {
    backgroundType: 'color',
    colorValue: background?.value || DEFAULT_BACKGROUND_COLOR,
    imageData: '',
    imageName: '',
  };
};

const createInitialBoardForm = () => ({
  title: '',
  description: '',
  backgroundType: 'color',
  colorValue: DEFAULT_BACKGROUND_COLOR,
  imageData: '',
  imageName: '',
});

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

  const [newBoard, setNewBoard] = useState(createInitialBoardForm());
  const [editingId, setEditingId] = useState(null);
  const [editFields, setEditFields] = useState(createInitialBoardForm());
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const resetCreateBoardForm = useCallback(() => {
    setNewBoard(createInitialBoardForm());
  }, []);

  const closeCreateBoardModal = useCallback(() => {
    setIsCreateModalOpen(false);
    resetCreateBoardForm();
  }, [resetCreateBoardForm]);

  const handleImageSelection = (event, updater) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      updater((prev) => ({
        ...prev,
        imageData: typeof reader.result === 'string' ? reader.result : '',
        imageName: file.name,
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const createPreviewBackground =
    newBoard.backgroundType === 'image' && newBoard.imageData
      ? { type: 'image', value: newBoard.imageData }
      : { type: 'color', value: newBoard.colorValue };

  const editingPreviewBackground =
    editFields.backgroundType === 'image' && editFields.imageData
      ? { type: 'image', value: editFields.imageData }
      : { type: 'color', value: editFields.colorValue };

  const isCreateDisabled =
    createStatus === 'loading' || (newBoard.backgroundType === 'image' && !newBoard.imageData);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchBoards());
    }
  }, [dispatch, status]);

  useEffect(() => {
    if (!isCreateModalOpen) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeCreateBoardModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCreateModalOpen, closeCreateBoardModal]);

  const handleCreateBoard = async (event) => {
    event.preventDefault();
    const trimmedTitle = newBoard.title.trim();
    if (!trimmedTitle) return;
    if (newBoard.backgroundType === 'image' && !newBoard.imageData) return;

    try {
      const payloadBackground = buildBackgroundPayload(newBoard);
      const created = await dispatch(
        createBoard({
          title: trimmedTitle,
          description: newBoard.description.trim(),
          background: payloadBackground,
        }),
      ).unwrap();
      closeCreateBoardModal();
      navigate(`/boards/${created.id}`);
    } catch {
      // Error surfaced through slice state so swallow here.
    }
  };

  const startEditing = (board) => {
    setEditingId(board.id);
    setEditFields({
      title: board.title,
      description: board.description ?? '',
      ...extractBackgroundFormState(board.background),
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFields(createInitialBoardForm());
  };

  const handleUpdateBoard = async (event) => {
    event.preventDefault();
    if (!editingId) return;
    if (editFields.backgroundType === 'image' && !editFields.imageData) return;
    try {
      await dispatch(
        updateBoard({
          id: editingId,
          changes: {
            title: editFields.title.trim(),
            description: editFields.description.trim(),
            background: buildBackgroundPayload(editFields),
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
          <div className="flex flex-wrap items-center gap-4">
            <div
              className="h-16 w-32 rounded-lg border border-slate-200"
              style={getBackgroundPreviewStyle(createPreviewBackground)}
              aria-hidden="true"
            />
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600"
            >
              Create board
            </button>
          </div>
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
              const isEditing = editingId === board.id;
              const isUpdating = updateStatus === 'loading' && updatingId === board.id;
              const isDeleting = deleteStatus === 'loading' && deletingId === board.id;
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
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-700">Background</p>
                          <div
                            className="h-10 w-20 rounded-md border border-slate-200"
                            style={getBackgroundPreviewStyle(editingPreviewBackground)}
                          />
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <label className="inline-flex items-center gap-2 font-medium text-slate-700">
                            <input
                              type="radio"
                              name={`edit-background-type-${board.id}`}
                              value="color"
                              checked={editFields.backgroundType === 'color'}
                              onChange={() =>
                                setEditFields((prev) => ({ ...prev, backgroundType: 'color' }))
                              }
                            />
                            Color
                          </label>
                          <label className="inline-flex items-center gap-2 font-medium text-slate-700">
                            <input
                              type="radio"
                              name={`edit-background-type-${board.id}`}
                              value="image"
                              checked={editFields.backgroundType === 'image'}
                              onChange={() =>
                                setEditFields((prev) => ({ ...prev, backgroundType: 'image' }))
                              }
                            />
                            Image
                          </label>
                        </div>
                        {editFields.backgroundType === 'color' ? (
                          <div className="flex flex-wrap items-center gap-4">
                            <input
                              type="color"
                              value={editFields.colorValue}
                              onChange={(event) =>
                                setEditFields((prev) => ({
                                  ...prev,
                                  colorValue: event.target.value,
                                }))
                              }
                              aria-label="Board color"
                              className="h-10 w-14 cursor-pointer rounded border border-slate-300 bg-transparent"
                            />
                            <input
                              type="text"
                              value={editFields.colorValue}
                              onChange={(event) =>
                                setEditFields((prev) => ({
                                  ...prev,
                                  colorValue: event.target.value,
                                }))
                              }
                              className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                              placeholder="#0f172a"
                            />
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(event) => handleImageSelection(event, setEditFields)}
                              className="w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700"
                            />
                            {editFields.imageData ? (
                              <div className="flex flex-wrap items-center gap-4">
                                <img
                                  src={editFields.imageData}
                                  alt="Selected board background"
                                  className="h-16 w-28 rounded-md object-cover"
                                />
                                <div className="space-y-1 text-sm text-slate-600">
                                  {editFields.imageName && (
                                    <p className="font-medium">{editFields.imageName}</p>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditFields((prev) => ({
                                        ...prev,
                                        imageData: '',
                                        imageName: '',
                                      }))
                                    }
                                    className="text-blue-600 hover:underline"
                                  >
                                    Remove image
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">
                                Upload a JPG or PNG to refresh your board background.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                      {updateError && updatingId === board.id && (
                        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">
                          {updateError}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="submit"
                          disabled={
                            isUpdating ||
                            (editFields.backgroundType === 'image' && !editFields.imageData)
                          }
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
                      <Link
                        to={`/boards/${board.id}`}
                        className="block overflow-hidden rounded-xl"
                        style={getBackgroundPreviewStyle(boardBackground)}
                      >
                        <div className="flex h-40 flex-col justify-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-4 text-white">
                          <p className="text-xs uppercase tracking-wide">
                            {isOwner
                              ? 'Owned board'
                              : `Shared · ${board.membershipRole ?? 'member'}`}
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
                        <div className="flex flex-wrap gap-2">
                          <Link
                            to={`/boards/${board.id}`}
                            className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-50"
                          >
                            Open
                          </Link>
                          {isOwner && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEditing(board)}
                                className="inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBoard(board.id)}
                                disabled={isDeleting}
                                className="inline-flex items-center rounded-md border border-red-200 px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-75"
                              >
                                {isDeleting ? 'Deleting…' : 'Delete'}
                              </button>
                            </>
                          )}
                        </div>
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

      {isCreateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 z-0 bg-slate-900/60"
            aria-label="Close create board modal"
            onClick={closeCreateBoardModal}
            tabIndex={-1}
          />
          <div
            className="relative z-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Create a new board</h2>
                <p className="text-sm text-slate-600">
                  Give your board a title, then choose a background color or hero image.
                </p>
              </div>
              <button
                type="button"
                onClick={closeCreateBoardModal}
                className="rounded-md p-1 text-slate-500 hover:bg-slate-100"
                aria-label="Close modal"
              >
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <form onSubmit={handleCreateBoard} className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-sm font-medium text-slate-700">Background preview</p>
                  <p className="text-xs text-slate-500">Updates as you change the form below.</p>
                </div>
                <div
                  className="h-16 w-32 rounded-lg border border-slate-200"
                  style={getBackgroundPreviewStyle(createPreviewBackground)}
                  aria-hidden="true"
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label htmlFor="new-board-title" className="text-sm font-medium text-slate-700">
                    Board title
                  </label>
                  <input
                    id="new-board-title"
                    name="title"
                    type="text"
                    value={newBoard.title}
                    onChange={(event) =>
                      setNewBoard((prev) => ({ ...prev, title: event.target.value }))
                    }
                    placeholder="e.g. Website redesign"
                    required
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="new-board-description"
                    className="text-sm font-medium text-slate-700"
                  >
                    Description
                  </label>
                  <input
                    id="new-board-description"
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
              <div className="space-y-3">
                <p className="text-sm font-medium text-slate-700">Background</p>
                <div className="flex flex-wrap gap-4 text-sm">
                  <label className="inline-flex items-center gap-2 font-medium text-slate-700">
                    <input
                      type="radio"
                      name="new-board-background-type"
                      value="color"
                      checked={newBoard.backgroundType === 'color'}
                      onChange={() => setNewBoard((prev) => ({ ...prev, backgroundType: 'color' }))}
                    />
                    Color
                  </label>
                  <label className="inline-flex items-center gap-2 font-medium text-slate-700">
                    <input
                      type="radio"
                      name="new-board-background-type"
                      value="image"
                      checked={newBoard.backgroundType === 'image'}
                      onChange={() => setNewBoard((prev) => ({ ...prev, backgroundType: 'image' }))}
                    />
                    Image
                  </label>
                </div>
                {newBoard.backgroundType === 'color' ? (
                  <div className="flex flex-wrap items-center gap-4">
                    <input
                      type="color"
                      value={newBoard.colorValue}
                      onChange={(event) =>
                        setNewBoard((prev) => ({ ...prev, colorValue: event.target.value }))
                      }
                      aria-label="Board color"
                      className="h-12 w-16 cursor-pointer rounded border border-slate-300 bg-transparent"
                    />
                    <input
                      type="text"
                      value={newBoard.colorValue}
                      onChange={(event) =>
                        setNewBoard((prev) => ({ ...prev, colorValue: event.target.value }))
                      }
                      className="w-40 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none"
                      placeholder="#0f172a"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => handleImageSelection(event, setNewBoard)}
                      className="w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700"
                    />
                    {newBoard.imageData ? (
                      <div className="flex flex-wrap items-center gap-4">
                        <img
                          src={newBoard.imageData}
                          alt="Board background preview"
                          className="h-16 w-28 rounded-md object-cover"
                        />
                        <div className="space-y-1 text-sm text-slate-600">
                          {newBoard.imageName && (
                            <p className="font-medium">{newBoard.imageName}</p>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setNewBoard((prev) => ({ ...prev, imageData: '', imageName: '' }))
                            }
                            className="text-blue-600 hover:underline"
                          >
                            Remove image
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">
                        Upload a JPG or PNG. Large images will be stored as part of the board
                        background.
                      </p>
                    )}
                  </div>
                )}
              </div>
              {createError && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{createError}</p>
              )}
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeCreateBoardModal}
                  className="inline-flex items-center rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreateDisabled}
                  className="bg-primary text-primary-foreground inline-flex items-center rounded-md px-4 py-2 text-sm font-medium shadow hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-75"
                >
                  {createStatus === 'loading' ? 'Creating…' : 'Create board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default BoardsPage;

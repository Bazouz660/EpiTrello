import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';

const httpClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('../../services/httpClient.js', () => ({
  httpClient: httpClientMock,
}));

vi.mock('../auth/authSlice.js', () => ({
  clearSession: { type: 'auth/clearSession' },
}));

const resetHttpClient = () => {
  httpClientMock.get.mockReset();
  httpClientMock.post.mockReset();
  httpClientMock.patch.mockReset();
  httpClientMock.delete.mockReset();
};

const importBoardsSlice = async () => {
  vi.resetModules();
  resetHttpClient();
  return import('./boardsSlice.js');
};

describe('boardsSlice', () => {
  it('fetches boards successfully', async () => {
    const { boardsReducer, fetchBoards, selectBoards } = await importBoardsSlice();
    const mockBoards = [
      {
        id: 'board-1',
        title: 'Sprint Planning',
        description: 'Prepare backlog',
        background: { type: 'color', value: '#0f172a' },
      },
    ];

    httpClientMock.get.mockResolvedValue({ data: { boards: mockBoards } });

    const store = configureStore({ reducer: { boards: boardsReducer } });

    await store.dispatch(fetchBoards());

    const state = selectBoards(store.getState());
    expect(state.status).toBe('succeeded');
    expect(state.items).toEqual(mockBoards);
    expect(state.error).toBeNull();
  });

  it('records an error when fetching boards fails', async () => {
    const { boardsReducer, fetchBoards, selectBoards } = await importBoardsSlice();

    httpClientMock.get.mockRejectedValue({ response: { data: { message: 'Unauthorized' } } });

    const store = configureStore({ reducer: { boards: boardsReducer } });

    await store.dispatch(fetchBoards());

    const state = selectBoards(store.getState());
    expect(state.status).toBe('failed');
    expect(state.error).toBe('Unauthorized');
    expect(state.items).toEqual([]);
  });

  it('creates a board and prepends it to the list', async () => {
    const { boardsReducer, createBoard, selectBoards } = await importBoardsSlice();

    const store = configureStore({ reducer: { boards: boardsReducer } });

    const newBoard = {
      id: 'board-2',
      title: 'Website Redesign',
      description: 'Marketing site',
      background: { type: 'color', value: '#0f172a' },
    };

    httpClientMock.post.mockResolvedValue({ data: { board: newBoard } });

    await store.dispatch(createBoard({ title: newBoard.title, description: newBoard.description }));

    const state = selectBoards(store.getState());
    expect(state.createStatus).toBe('succeeded');
    expect(state.items[0]).toEqual(newBoard);
  });

  it('updates a board and keeps selection in sync', async () => {
    const { boardsReducer, updateBoard, selectBoards, createBoardsInitialState } =
      await importBoardsSlice();

    const originalBoard = {
      id: 'board-3',
      title: 'Team Retro',
      description: 'Discuss wins and improvements',
      background: { type: 'color', value: '#0f172a' },
    };

    const updatedBoard = {
      ...originalBoard,
      title: 'Team Retrospective',
      description: 'Weekly retro',
      background: { type: 'color', value: '#312e81' },
    };

    const initialBoardsState = createBoardsInitialState();
    initialBoardsState.items = [originalBoard];
    initialBoardsState.selectedBoard = originalBoard;

    httpClientMock.patch.mockResolvedValue({ data: { board: updatedBoard } });

    const store = configureStore({
      reducer: { boards: boardsReducer },
      preloadedState: { boards: initialBoardsState },
    });

    await store.dispatch(updateBoard({ id: originalBoard.id, changes: updatedBoard }));

    const state = selectBoards(store.getState());
    expect(state.updateStatus).toBe('succeeded');
    expect(state.items[0]).toEqual(updatedBoard);
    expect(state.selectedBoard).toEqual(updatedBoard);
  });

  it('deletes a board and clears selection when necessary', async () => {
    const { boardsReducer, deleteBoard, selectBoards, createBoardsInitialState } =
      await importBoardsSlice();

    const board = { id: 'board-4', title: 'Hiring Plan', description: 'Pipeline tracking' };
    const initialBoardsState = createBoardsInitialState();
    initialBoardsState.items = [board];
    initialBoardsState.selectedBoard = board;

    httpClientMock.delete.mockResolvedValue({});

    const store = configureStore({
      reducer: { boards: boardsReducer },
      preloadedState: { boards: initialBoardsState },
    });

    await store.dispatch(deleteBoard({ id: board.id }));

    const state = selectBoards(store.getState());
    expect(state.items).toEqual([]);
    expect(state.selectedBoard).toBeNull();
    expect(state.deleteStatus).toBe('succeeded');
  });

  it('resets to the initial state when the auth session is cleared', async () => {
    const { boardsReducer, selectBoards } = await importBoardsSlice();

    const store = configureStore({ reducer: { boards: boardsReducer } });

    store.dispatch({ type: 'boards/create/fulfilled', payload: { id: 'board-5', title: 'Temp' } });

    expect(selectBoards(store.getState()).items).toHaveLength(1);

    store.dispatch({ type: 'auth/clearSession' });

    const state = selectBoards(store.getState());
    expect(state.items).toHaveLength(0);
    expect(state.status).toBe('idle');
  });

  it('records an error when board creation fails', async () => {
    const { boardsReducer, createBoard, selectBoards } = await importBoardsSlice();

    httpClientMock.post.mockRejectedValue({ response: { data: { message: 'Invalid title' } } });

    const store = configureStore({ reducer: { boards: boardsReducer } });

    await store.dispatch(createBoard({ title: '', description: 'Test' }));

    const state = selectBoards(store.getState());
    expect(state.createStatus).toBe('failed');
    expect(state.createError).toBe('Invalid title');
  });

  it('records an error when board update fails', async () => {
    const { boardsReducer, updateBoard, selectBoards, createBoardsInitialState } =
      await importBoardsSlice();

    const board = { id: 'board-10', title: 'Original', description: 'Desc' };
    const initialState = createBoardsInitialState();
    initialState.items = [board];

    httpClientMock.patch.mockRejectedValue({ response: { data: { message: 'Board not found' } } });

    const store = configureStore({
      reducer: { boards: boardsReducer },
      preloadedState: { boards: initialState },
    });

    await store.dispatch(updateBoard({ id: 'board-10', changes: { title: 'Updated' } }));

    const state = selectBoards(store.getState());
    expect(state.updateStatus).toBe('failed');
    expect(state.updateError).toBe('Board not found');
    expect(state.updatingId).toBeNull();
  });

  it('records an error when board deletion fails', async () => {
    const { boardsReducer, deleteBoard, selectBoards, createBoardsInitialState } =
      await importBoardsSlice();

    const board = { id: 'board-11', title: 'Keep me', description: 'Desc' };
    const initialState = createBoardsInitialState();
    initialState.items = [board];

    httpClientMock.delete.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });

    const store = configureStore({
      reducer: { boards: boardsReducer },
      preloadedState: { boards: initialState },
    });

    await store.dispatch(deleteBoard({ id: 'board-11' }));

    const state = selectBoards(store.getState());
    expect(state.deleteStatus).toBe('failed');
    expect(state.deleteError).toBe('Forbidden');
    expect(state.deletingId).toBeNull();
    expect(state.items).toHaveLength(1);
  });

  it('fetches a board by ID successfully', async () => {
    const { boardsReducer, fetchBoardById, selectBoards } = await importBoardsSlice();

    const board = { id: 'board-20', title: 'Fetched Board', description: 'Details' };
    httpClientMock.get.mockResolvedValue({ data: { board } });

    const store = configureStore({ reducer: { boards: boardsReducer } });

    await store.dispatch(fetchBoardById({ id: 'board-20' }));

    const state = selectBoards(store.getState());
    expect(state.selectedStatus).toBe('succeeded');
    expect(state.selectedBoard).toEqual(board);
    expect(state.selectedError).toBeNull();
  });

  it('records an error when fetchBoardById fails', async () => {
    const { boardsReducer, fetchBoardById, selectBoards } = await importBoardsSlice();

    httpClientMock.get.mockRejectedValue({ response: { data: { message: 'Not found' } } });

    const store = configureStore({ reducer: { boards: boardsReducer } });

    await store.dispatch(fetchBoardById({ id: 'board-nonexistent' }));

    const state = selectBoards(store.getState());
    expect(state.selectedStatus).toBe('failed');
    expect(state.selectedBoard).toBeNull();
    expect(state.selectedError).toBe('Not found');
  });

  it('clears boards state with clearBoardsState action', async () => {
    const { boardsReducer, clearBoardsState, selectBoards, createBoardsInitialState } =
      await importBoardsSlice();

    const initialState = createBoardsInitialState();
    initialState.items = [{ id: 'board-50', title: 'Test' }];
    initialState.status = 'succeeded';
    initialState.selectedBoard = { id: 'board-50', title: 'Test' };

    const store = configureStore({
      reducer: { boards: boardsReducer },
      preloadedState: { boards: initialState },
    });

    store.dispatch(clearBoardsState());

    const state = selectBoards(store.getState());
    expect(state.items).toEqual([]);
    expect(state.status).toBe('idle');
    expect(state.selectedBoard).toBeNull();
  });

  it('creates a board with background', async () => {
    const { boardsReducer, createBoard, selectBoards } = await importBoardsSlice();

    const newBoard = {
      id: 'board-bg',
      title: 'With Background',
      description: 'Has bg',
      background: { type: 'color', value: '#ff0000' },
    };

    httpClientMock.post.mockResolvedValue({ data: { board: newBoard } });

    const store = configureStore({ reducer: { boards: boardsReducer } });

    await store.dispatch(
      createBoard({
        title: newBoard.title,
        description: newBoard.description,
        background: { type: 'color', value: '#ff0000' },
      }),
    );

    const state = selectBoards(store.getState());
    expect(state.createStatus).toBe('succeeded');
    expect(state.items[0].background).toEqual({ type: 'color', value: '#ff0000' });
  });
});

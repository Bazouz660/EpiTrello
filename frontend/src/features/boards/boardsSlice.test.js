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
});

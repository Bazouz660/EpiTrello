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

const importListsSlice = async () => {
  vi.resetModules();
  resetHttpClient();
  return import('./listsSlice.js');
};

describe('listsSlice', () => {
  it('fetches lists for a board', async () => {
    const { fetchListsByBoard, listsReducer, selectLists } = await importListsSlice();

    const mockLists = [
      { id: 'list-1', board: 'board-1', position: 0, title: 'Todo' },
      { id: 'list-2', board: 'board-1', position: 1, title: 'Doing' },
    ];
    httpClientMock.get.mockResolvedValue({ data: { lists: mockLists } });

    const store = configureStore({ reducer: { lists: listsReducer } });
    await store.dispatch(fetchListsByBoard({ boardId: 'board-1' }));

    const state = selectLists(store.getState());
    expect(state.fetchStatusByBoard['board-1']).toBe('succeeded');
    expect(state.idsByBoard['board-1']).toEqual(['list-1', 'list-2']);
    expect(state.entities['list-1']).toEqual(mockLists[0]);
  });

  it('records an error when list fetching fails', async () => {
    const { fetchListsByBoard, listsReducer, selectLists } = await importListsSlice();

    httpClientMock.get.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });

    const store = configureStore({ reducer: { lists: listsReducer } });
    await store.dispatch(fetchListsByBoard({ boardId: 'board-7' }));

    const state = selectLists(store.getState());
    expect(state.fetchStatusByBoard['board-7']).toBe('failed');
    expect(state.fetchErrorByBoard['board-7']).toBe('Forbidden');
  });

  it('creates a list and orders ids by position', async () => {
    const { createList, listsReducer, selectLists } = await importListsSlice();

    const newList = { id: 'list-3', board: 'board-2', position: 0, title: 'Backlog' };
    httpClientMock.post.mockResolvedValue({ data: { list: newList } });

    const store = configureStore({ reducer: { lists: listsReducer } });
    await store.dispatch(createList({ title: 'Backlog', board: 'board-2' }));

    const state = selectLists(store.getState());
    expect(state.createStatus).toBe('succeeded');
    expect(state.idsByBoard['board-2']).toEqual(['list-3']);
    expect(state.entities['list-3']).toEqual(newList);
  });

  it('updates a list and keeps ordering stable', async () => {
    const { createListsInitialState, listsReducer, selectLists, updateList } =
      await importListsSlice();

    const initialState = createListsInitialState();
    initialState.entities['list-4'] = {
      id: 'list-4',
      board: 'board-3',
      position: 0,
      title: 'Ready',
    };
    initialState.idsByBoard['board-3'] = ['list-4'];

    const updated = { id: 'list-4', board: 'board-3', position: 0, title: 'Ready to Start' };
    httpClientMock.patch.mockResolvedValue({ data: { list: updated } });

    const store = configureStore({
      reducer: { lists: listsReducer },
      preloadedState: { lists: initialState },
    });

    await store.dispatch(updateList({ id: 'list-4', changes: { title: updated.title } }));

    const state = selectLists(store.getState());
    expect(state.updateStatus).toBe('succeeded');
    expect(state.entities['list-4'].title).toBe('Ready to Start');
    expect(state.idsByBoard['board-3']).toEqual(['list-4']);
  });

  it('deletes a list and removes it from board mappings', async () => {
    const { createListsInitialState, deleteList, listsReducer, selectLists } =
      await importListsSlice();

    const initialState = createListsInitialState();
    initialState.entities['list-5'] = {
      id: 'list-5',
      board: 'board-4',
      position: 0,
      title: 'Archive',
    };
    initialState.idsByBoard['board-4'] = ['list-5'];

    httpClientMock.delete.mockResolvedValue({});

    const store = configureStore({
      reducer: { lists: listsReducer },
      preloadedState: { lists: initialState },
    });

    await store.dispatch(deleteList({ id: 'list-5' }));

    const state = selectLists(store.getState());
    expect(state.idsByBoard['board-4']).toEqual([]);
    expect(state.entities['list-5']).toBeUndefined();
    expect(state.deleteStatus).toBe('succeeded');
  });

  it('resets state when the auth session clears', async () => {
    const { listsReducer, selectLists } = await importListsSlice();

    const store = configureStore({ reducer: { lists: listsReducer } });
    store.dispatch({
      type: 'lists/create/fulfilled',
      payload: { id: 'list-temp', board: 'board-9' },
    });

    store.dispatch({ type: 'auth/clearSession' });

    const state = selectLists(store.getState());
    expect(state.entities).toEqual({});
    expect(state.idsByBoard).toEqual({});
    expect(state.createStatus).toBe('idle');
  });
});

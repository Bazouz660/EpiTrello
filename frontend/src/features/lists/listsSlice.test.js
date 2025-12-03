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

  it('records an error when list creation fails', async () => {
    const { createList, listsReducer, selectLists } = await importListsSlice();

    httpClientMock.post.mockRejectedValue({ response: { data: { message: 'Board not found' } } });

    const store = configureStore({ reducer: { lists: listsReducer } });
    await store.dispatch(createList({ title: 'Test', board: 'board-x' }));

    const state = selectLists(store.getState());
    expect(state.createStatus).toBe('failed');
    expect(state.createError).toBe('Board not found');
  });

  it('records an error when list update fails', async () => {
    const { createListsInitialState, listsReducer, selectLists, updateList } =
      await importListsSlice();

    const initialState = createListsInitialState();
    initialState.entities['list-10'] = { id: 'list-10', board: 'board-a', title: 'Original' };
    initialState.idsByBoard['board-a'] = ['list-10'];

    httpClientMock.patch.mockRejectedValue({ response: { data: { message: 'List not found' } } });

    const store = configureStore({
      reducer: { lists: listsReducer },
      preloadedState: { lists: initialState },
    });

    await store.dispatch(updateList({ id: 'list-10', changes: { title: 'Updated' } }));

    const state = selectLists(store.getState());
    expect(state.updateStatus).toBe('failed');
    expect(state.updateError).toBe('List not found');
  });

  it('records an error when list deletion fails', async () => {
    const { createListsInitialState, deleteList, listsReducer, selectLists } =
      await importListsSlice();

    const initialState = createListsInitialState();
    initialState.entities['list-11'] = { id: 'list-11', board: 'board-b', title: 'Keep me' };
    initialState.idsByBoard['board-b'] = ['list-11'];

    httpClientMock.delete.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });

    const store = configureStore({
      reducer: { lists: listsReducer },
      preloadedState: { lists: initialState },
    });

    await store.dispatch(deleteList({ id: 'list-11' }));

    const state = selectLists(store.getState());
    expect(state.deleteStatus).toBe('failed');
    expect(state.deleteError).toBe('Forbidden');
    expect(state.entities['list-11']).toBeDefined();
  });

  it('reorders lists via reorderLists thunk', async () => {
    const { createListsInitialState, listsReducer, reorderLists, selectLists } =
      await importListsSlice();

    const initialState = createListsInitialState();
    initialState.entities['list-20'] = {
      id: 'list-20',
      board: 'board-x',
      position: 0,
      title: 'First',
    };
    initialState.entities['list-21'] = {
      id: 'list-21',
      board: 'board-x',
      position: 1,
      title: 'Second',
    };
    initialState.idsByBoard['board-x'] = ['list-20', 'list-21'];

    const reorderedLists = [
      { id: 'list-21', board: 'board-x', position: 0, title: 'Second' },
      { id: 'list-20', board: 'board-x', position: 1, title: 'First' },
    ];
    httpClientMock.post.mockResolvedValue({ data: { lists: reorderedLists } });

    const store = configureStore({
      reducer: { lists: listsReducer },
      preloadedState: { lists: initialState },
    });

    await store.dispatch(reorderLists({ boardId: 'board-x', listIds: ['list-21', 'list-20'] }));

    const state = selectLists(store.getState());
    expect(state.reorderStatus).toBe('succeeded');
    expect(state.idsByBoard['board-x']).toEqual(['list-21', 'list-20']);
  });

  it('records an error when reorderLists fails', async () => {
    const { createListsInitialState, listsReducer, reorderLists, selectLists } =
      await importListsSlice();

    const initialState = createListsInitialState();
    initialState.entities['list-30'] = { id: 'list-30', board: 'board-y', position: 0, title: 'A' };
    initialState.idsByBoard['board-y'] = ['list-30'];

    httpClientMock.post.mockRejectedValue({ response: { data: { message: 'Reorder failed' } } });

    const store = configureStore({
      reducer: { lists: listsReducer },
      preloadedState: { lists: initialState },
    });

    await store.dispatch(reorderLists({ boardId: 'board-y', listIds: ['list-30'] }));

    const state = selectLists(store.getState());
    expect(state.reorderStatus).toBe('failed');
    expect(state.reorderError).toBe('Reorder failed');
  });

  it('performs optimistic list reordering', async () => {
    const { createListsInitialState, listsReducer, optimisticReorderLists, selectLists } =
      await importListsSlice();

    const initialState = createListsInitialState();
    initialState.entities['list-40'] = {
      id: 'list-40',
      board: 'board-z',
      position: 0,
      title: 'First',
    };
    initialState.entities['list-41'] = {
      id: 'list-41',
      board: 'board-z',
      position: 1,
      title: 'Second',
    };
    initialState.idsByBoard['board-z'] = ['list-40', 'list-41'];

    const store = configureStore({
      reducer: { lists: listsReducer },
      preloadedState: { lists: initialState },
    });

    store.dispatch(
      optimisticReorderLists({
        boardId: 'board-z',
        listIds: ['list-41', 'list-40'],
      }),
    );

    const state = selectLists(store.getState());
    expect(state.idsByBoard['board-z']).toEqual(['list-41', 'list-40']);
    expect(state.entities['list-41'].position).toBe(0);
    expect(state.entities['list-40'].position).toBe(1);
  });

  it('clears list state with clearListsState action', async () => {
    const { createListsInitialState, clearListsState, listsReducer, selectLists } =
      await importListsSlice();

    const initialState = createListsInitialState();
    initialState.entities['list-50'] = { id: 'list-50', board: 'board-x', title: 'Test' };
    initialState.idsByBoard['board-x'] = ['list-50'];
    initialState.createStatus = 'succeeded';

    const store = configureStore({
      reducer: { lists: listsReducer },
      preloadedState: { lists: initialState },
    });

    store.dispatch(clearListsState());

    const state = selectLists(store.getState());
    expect(state.entities).toEqual({});
    expect(state.idsByBoard).toEqual({});
    expect(state.createStatus).toBe('idle');
  });
});

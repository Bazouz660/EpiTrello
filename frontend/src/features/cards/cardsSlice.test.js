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

const importCardsSlice = async () => {
  vi.resetModules();
  resetHttpClient();
  return import('./cardsSlice.js');
};

describe('cardsSlice', () => {
  it('fetches cards for a list', async () => {
    const { cardsReducer, fetchCardsByList, selectCards } = await importCardsSlice();

    const mockCards = [
      { id: 'card-1', list: 'list-a', position: 0, title: 'Draft copy' },
      { id: 'card-2', list: 'list-a', position: 1, title: 'Review' },
    ];
    httpClientMock.get.mockResolvedValue({ data: { cards: mockCards } });

    const store = configureStore({ reducer: { cards: cardsReducer } });
    await store.dispatch(fetchCardsByList({ listId: 'list-a' }));

    const state = selectCards(store.getState());
    expect(state.fetchStatusByList['list-a']).toBe('succeeded');
    expect(state.idsByList['list-a']).toEqual(['card-1', 'card-2']);
    expect(state.entities['card-1']).toEqual(mockCards[0]);
  });

  it('records an error when card fetching fails', async () => {
    const { cardsReducer, fetchCardsByList, selectCards } = await importCardsSlice();

    httpClientMock.get.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });

    const store = configureStore({ reducer: { cards: cardsReducer } });
    await store.dispatch(fetchCardsByList({ listId: 'list-x' }));

    const state = selectCards(store.getState());
    expect(state.fetchStatusByList['list-x']).toBe('failed');
    expect(state.fetchErrorByList['list-x']).toBe('Forbidden');
  });

  it('creates a card and injects it into the correct list ordering', async () => {
    const { cardsReducer, createCard, selectCards } = await importCardsSlice();

    const newCard = { id: 'card-3', list: 'list-b', position: 0, title: 'Outline' };
    httpClientMock.post.mockResolvedValue({ data: { card: newCard } });

    const store = configureStore({ reducer: { cards: cardsReducer } });
    await store.dispatch(createCard({ list: 'list-b', title: 'Outline' }));

    const state = selectCards(store.getState());
    expect(state.createStatus).toBe('succeeded');
    expect(state.idsByList['list-b']).toEqual(['card-3']);
    expect(state.entities['card-3']).toEqual(newCard);
  });

  it('updates a card and moves it between lists when required', async () => {
    const { cardsReducer, createCardsInitialState, selectCards, updateCard } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-4'] = {
      id: 'card-4',
      list: 'list-c',
      position: 0,
      title: 'Plan',
    };
    initialState.idsByList['list-c'] = ['card-4'];

    const updated = { id: 'card-4', list: 'list-d', position: 0, title: 'Plan ready' };
    httpClientMock.patch.mockResolvedValue({ data: { card: updated } });

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    await store.dispatch(
      updateCard({ id: 'card-4', changes: { list: 'list-d', title: 'Plan ready' } }),
    );

    const state = selectCards(store.getState());
    expect(state.updateStatus).toBe('succeeded');
    expect(state.idsByList['list-c']).toEqual([]);
    expect(state.idsByList['list-d']).toEqual(['card-4']);
    expect(state.entities['card-4'].title).toBe('Plan ready');
  });

  it('deletes a card and removes it from its list mapping', async () => {
    const { cardsReducer, createCardsInitialState, deleteCard, selectCards } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-5'] = {
      id: 'card-5',
      list: 'list-e',
      position: 0,
      title: 'Archive me',
    };
    initialState.idsByList['list-e'] = ['card-5'];

    httpClientMock.delete.mockResolvedValue({});

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    await store.dispatch(deleteCard({ id: 'card-5' }));

    const state = selectCards(store.getState());
    expect(state.idsByList['list-e']).toEqual([]);
    expect(state.entities['card-5']).toBeUndefined();
    expect(state.deleteStatus).toBe('succeeded');
  });

  it('resets card state when the auth session clears', async () => {
    const { cardsReducer, selectCards } = await importCardsSlice();

    const store = configureStore({ reducer: { cards: cardsReducer } });
    store.dispatch({
      type: 'cards/create/fulfilled',
      payload: { id: 'card-temp', list: 'list-z' },
    });

    store.dispatch({ type: 'auth/clearSession' });

    const state = selectCards(store.getState());
    expect(state.entities).toEqual({});
    expect(state.idsByList).toEqual({});
    expect(state.createStatus).toBe('idle');
  });

  it('records an error when card creation fails', async () => {
    const { cardsReducer, createCard, selectCards } = await importCardsSlice();

    httpClientMock.post.mockRejectedValue({ response: { data: { message: 'List not found' } } });

    const store = configureStore({ reducer: { cards: cardsReducer } });
    await store.dispatch(createCard({ list: 'list-x', title: 'Test' }));

    const state = selectCards(store.getState());
    expect(state.createStatus).toBe('failed');
    expect(state.createError).toBe('List not found');
  });

  it('records an error when card update fails', async () => {
    const { cardsReducer, createCardsInitialState, selectCards, updateCard } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-10'] = { id: 'card-10', list: 'list-a', title: 'Original' };
    initialState.idsByList['list-a'] = ['card-10'];

    httpClientMock.patch.mockRejectedValue({ response: { data: { message: 'Card not found' } } });

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    await store.dispatch(updateCard({ id: 'card-10', changes: { title: 'Updated' } }));

    const state = selectCards(store.getState());
    expect(state.updateStatus).toBe('failed');
    expect(state.updateError).toBe('Card not found');
  });

  it('records an error when card deletion fails', async () => {
    const { cardsReducer, createCardsInitialState, deleteCard, selectCards } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-11'] = { id: 'card-11', list: 'list-b', title: 'Keep me' };
    initialState.idsByList['list-b'] = ['card-11'];

    httpClientMock.delete.mockRejectedValue({ response: { data: { message: 'Forbidden' } } });

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    await store.dispatch(deleteCard({ id: 'card-11' }));

    const state = selectCards(store.getState());
    expect(state.deleteStatus).toBe('failed');
    expect(state.deleteError).toBe('Forbidden');
    expect(state.entities['card-11']).toBeDefined();
  });

  it('moves a card between lists via moveCard thunk', async () => {
    const { cardsReducer, createCardsInitialState, moveCard, selectCards } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-20'] = {
      id: 'card-20',
      list: 'list-x',
      position: 0,
      title: 'Move me',
    };
    initialState.idsByList['list-x'] = ['card-20'];

    const movedCard = { id: 'card-20', list: 'list-y', position: 0, title: 'Move me' };
    httpClientMock.post.mockResolvedValue({ data: { card: movedCard } });

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    await store.dispatch(
      moveCard({
        cardId: 'card-20',
        targetListId: 'list-y',
        position: 0,
        sourceListCardIds: [],
        targetListCardIds: ['card-20'],
      }),
    );

    const state = selectCards(store.getState());
    expect(state.moveStatus).toBe('succeeded');
    expect(state.entities['card-20'].list).toBe('list-y');
  });

  it('records an error when moveCard fails', async () => {
    const { cardsReducer, createCardsInitialState, moveCard, selectCards } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-21'] = {
      id: 'card-21',
      list: 'list-x',
      position: 0,
      title: 'Stuck',
    };
    initialState.idsByList['list-x'] = ['card-21'];

    httpClientMock.post.mockRejectedValue({ response: { data: { message: 'Move failed' } } });

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    await store.dispatch(
      moveCard({
        cardId: 'card-21',
        targetListId: 'list-y',
        position: 0,
        sourceListCardIds: [],
        targetListCardIds: ['card-21'],
      }),
    );

    const state = selectCards(store.getState());
    expect(state.moveStatus).toBe('failed');
    expect(state.moveError).toBe('Move failed');
  });

  it('performs optimistic card move between different lists', async () => {
    const { cardsReducer, createCardsInitialState, optimisticMoveCard, selectCards } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-30'] = {
      id: 'card-30',
      list: 'list-a',
      position: 0,
      title: 'Card A',
    };
    initialState.entities['card-31'] = {
      id: 'card-31',
      list: 'list-a',
      position: 1,
      title: 'Card B',
    };
    initialState.idsByList['list-a'] = ['card-30', 'card-31'];
    initialState.idsByList['list-b'] = [];

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    store.dispatch(
      optimisticMoveCard({
        cardId: 'card-30',
        sourceListId: 'list-a',
        targetListId: 'list-b',
        sourceListCardIds: ['card-31'],
        targetListCardIds: ['card-30'],
      }),
    );

    const state = selectCards(store.getState());
    expect(state.idsByList['list-a']).toEqual(['card-31']);
    expect(state.idsByList['list-b']).toEqual(['card-30']);
    expect(state.entities['card-30'].list).toBe('list-b');
    expect(state.entities['card-31'].position).toBe(0);
    expect(state.entities['card-30'].position).toBe(0);
  });

  it('performs optimistic reorder within the same list', async () => {
    const { cardsReducer, createCardsInitialState, optimisticMoveCard, selectCards } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-40'] = {
      id: 'card-40',
      list: 'list-z',
      position: 0,
      title: 'First',
    };
    initialState.entities['card-41'] = {
      id: 'card-41',
      list: 'list-z',
      position: 1,
      title: 'Second',
    };
    initialState.idsByList['list-z'] = ['card-40', 'card-41'];

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    store.dispatch(
      optimisticMoveCard({
        cardId: 'card-41',
        sourceListId: 'list-z',
        targetListId: 'list-z',
        sourceListCardIds: ['card-41', 'card-40'],
        targetListCardIds: ['card-41', 'card-40'],
      }),
    );

    const state = selectCards(store.getState());
    expect(state.idsByList['list-z']).toEqual(['card-41', 'card-40']);
    expect(state.entities['card-41'].position).toBe(0);
    expect(state.entities['card-40'].position).toBe(1);
  });

  it('clears card state with clearCardsState action', async () => {
    const { cardsReducer, createCardsInitialState, clearCardsState, selectCards } =
      await importCardsSlice();

    const initialState = createCardsInitialState();
    initialState.entities['card-50'] = { id: 'card-50', list: 'list-x', title: 'Test' };
    initialState.idsByList['list-x'] = ['card-50'];
    initialState.createStatus = 'succeeded';

    const store = configureStore({
      reducer: { cards: cardsReducer },
      preloadedState: { cards: initialState },
    });

    store.dispatch(clearCardsState());

    const state = selectCards(store.getState());
    expect(state.entities).toEqual({});
    expect(state.idsByList).toEqual({});
    expect(state.createStatus).toBe('idle');
  });
});

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
});

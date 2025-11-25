import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { httpClient } from '../../services/httpClient.js';
import { clearSession } from '../auth/authSlice.js';

const extractErrorMessage = (error) => {
  const fallback = 'Unable to complete the request';
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  return error.message ?? fallback;
};

const buildInitialState = () => ({
  entities: {},
  idsByList: {},
  fetchStatusByList: {},
  fetchErrorByList: {},
  createStatus: 'idle',
  createError: null,
  creatingListId: null,
  updateStatus: 'idle',
  updateError: null,
  updatingId: null,
  deleteStatus: 'idle',
  deleteError: null,
  deletingId: null,
});

const initialState = buildInitialState();

const sortIdsByPosition = (ids, entities) =>
  [...ids].sort((a, b) => {
    const posA = entities[a]?.position ?? 0;
    const posB = entities[b]?.position ?? 0;
    if (posA === posB) return a.localeCompare(b);
    return posA - posB;
  });

export const fetchCardsByList = createAsyncThunk(
  'cards/fetchByList',
  async ({ listId }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/cards', { params: { list: listId } });
      return { listId, cards: data.cards ?? [] };
    } catch (error) {
      return rejectWithValue({ listId, message: extractErrorMessage(error) });
    }
  },
);

export const createCard = createAsyncThunk(
  'cards/create',
  async ({ list, title, description, position }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.post('/cards', { list, title, description, position });
      return data.card;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const updateCard = createAsyncThunk(
  'cards/update',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.patch(`/cards/${id}`, changes);
      return data.card;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const deleteCard = createAsyncThunk('cards/delete', async ({ id }, { rejectWithValue }) => {
  try {
    await httpClient.delete(`/cards/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    clearCardsState: () => buildInitialState(),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCardsByList.pending, (state, action) => {
        const listId = action.meta.arg.listId;
        state.fetchStatusByList[listId] = 'loading';
        state.fetchErrorByList[listId] = null;
      })
      .addCase(fetchCardsByList.fulfilled, (state, action) => {
        const { listId, cards } = action.payload;
        state.fetchStatusByList[listId] = 'succeeded';
        state.fetchErrorByList[listId] = null;
        state.idsByList[listId] = cards.map((card) => card.id);
        cards.forEach((card) => {
          state.entities[card.id] = card;
        });
      })
      .addCase(fetchCardsByList.rejected, (state, action) => {
        const listId = action.payload?.listId ?? action.meta.arg.listId;
        state.fetchStatusByList[listId] = 'failed';
        state.fetchErrorByList[listId] =
          action.payload?.message ?? action.error?.message ?? 'Failed to load cards';
      })
      .addCase(createCard.pending, (state, action) => {
        state.createStatus = 'loading';
        state.createError = null;
        state.creatingListId = action.meta.arg.list;
      })
      .addCase(createCard.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        const card = action.payload;
        state.creatingListId = null;
        state.entities[card.id] = card;
        if (!state.idsByList[card.list]) {
          state.idsByList[card.list] = [];
        }
        const filtered = state.idsByList[card.list].filter((id) => id !== card.id);
        state.idsByList[card.list] = sortIdsByPosition([...filtered, card.id], state.entities);
      })
      .addCase(createCard.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.creatingListId = null;
        state.createError = action.payload ?? action.error?.message ?? 'Failed to create card';
      })
      .addCase(updateCard.pending, (state, action) => {
        state.updateStatus = 'loading';
        state.updateError = null;
        state.updatingId = action.meta.arg.id;
      })
      .addCase(updateCard.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        const card = action.payload;
        const previousListId = state.entities[card.id]?.list;
        state.entities[card.id] = card;
        if (!state.idsByList[card.list]) {
          state.idsByList[card.list] = [];
        }
        if (!state.idsByList[card.list].includes(card.id)) {
          state.idsByList[card.list].push(card.id);
        }
        state.idsByList[card.list] = sortIdsByPosition(state.idsByList[card.list], state.entities);
        if (previousListId && previousListId !== card.list && state.idsByList[previousListId]) {
          state.idsByList[previousListId] = state.idsByList[previousListId].filter(
            (id) => id !== card.id,
          );
        }
        state.updatingId = null;
      })
      .addCase(updateCard.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updatingId = null;
        state.updateError = action.payload ?? action.error?.message ?? 'Failed to update card';
      })
      .addCase(deleteCard.pending, (state, action) => {
        state.deleteStatus = 'loading';
        state.deleteError = null;
        state.deletingId = action.meta.arg.id;
      })
      .addCase(deleteCard.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        const cardId = action.payload;
        const listId = state.entities[cardId]?.list;
        delete state.entities[cardId];
        if (listId && state.idsByList[listId]) {
          state.idsByList[listId] = state.idsByList[listId].filter((id) => id !== cardId);
        }
        state.deletingId = null;
      })
      .addCase(deleteCard.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.deletingId = null;
        state.deleteError = action.payload ?? action.error?.message ?? 'Failed to delete card';
      })
      .addCase(clearSession, () => buildInitialState());
  },
});

export const cardsReducer = cardsSlice.reducer;
export const { clearCardsState } = cardsSlice.actions;
export const selectCards = (state) => state.cards;
export const createCardsInitialState = () => buildInitialState();

export default cardsReducer;

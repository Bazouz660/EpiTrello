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
  idsByBoard: {},
  fetchStatusByBoard: {},
  fetchErrorByBoard: {},
  createStatus: 'idle',
  createError: null,
  creatingBoardId: null,
  updateStatus: 'idle',
  updateError: null,
  updatingId: null,
  deleteStatus: 'idle',
  deleteError: null,
  deletingId: null,
  reorderStatus: 'idle',
  reorderError: null,
});

const initialState = buildInitialState();

const sortIdsByPosition = (ids, entities) =>
  [...ids].sort((a, b) => {
    const posA = entities[a]?.position ?? 0;
    const posB = entities[b]?.position ?? 0;
    if (posA === posB) return a.localeCompare(b);
    return posA - posB;
  });

export const fetchListsByBoard = createAsyncThunk(
  'lists/fetchByBoard',
  async ({ boardId }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/lists', { params: { board: boardId } });
      return { boardId, lists: data.lists ?? [] };
    } catch (error) {
      return rejectWithValue({
        boardId,
        message: extractErrorMessage(error),
      });
    }
  },
);

export const createList = createAsyncThunk(
  'lists/create',
  async ({ title, board, position }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.post('/lists', { title, board, position });
      return data.list;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const updateList = createAsyncThunk(
  'lists/update',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.patch(`/lists/${id}`, changes);
      return data.list;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const deleteList = createAsyncThunk('lists/delete', async ({ id }, { rejectWithValue }) => {
  try {
    await httpClient.delete(`/lists/${id}`);
    return id;
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const reorderLists = createAsyncThunk(
  'lists/reorder',
  async ({ boardId, listIds }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.post('/lists/reorder', { boardId, listIds });
      return { boardId, lists: data.lists ?? [] };
    } catch (error) {
      return rejectWithValue({ boardId, listIds, message: extractErrorMessage(error) });
    }
  },
);

const listsSlice = createSlice({
  name: 'lists',
  initialState,
  reducers: {
    clearListsState: () => buildInitialState(),
    optimisticReorderLists: (state, action) => {
      const { boardId, listIds } = action.payload;
      state.idsByBoard[boardId] = listIds;
      // Update position in entities for sorting consistency
      listIds.forEach((id, index) => {
        if (state.entities[id]) {
          state.entities[id].position = index;
        }
      });
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchListsByBoard.pending, (state, action) => {
        const boardId = action.meta.arg.boardId;
        state.fetchStatusByBoard[boardId] = 'loading';
        state.fetchErrorByBoard[boardId] = null;
      })
      .addCase(fetchListsByBoard.fulfilled, (state, action) => {
        const { boardId, lists } = action.payload;
        state.fetchStatusByBoard[boardId] = 'succeeded';
        state.fetchErrorByBoard[boardId] = null;
        state.idsByBoard[boardId] = lists.map((list) => list.id);
        lists.forEach((list) => {
          state.entities[list.id] = list;
        });
      })
      .addCase(fetchListsByBoard.rejected, (state, action) => {
        const boardId = action.payload?.boardId ?? action.meta.arg.boardId;
        state.fetchStatusByBoard[boardId] = 'failed';
        state.fetchErrorByBoard[boardId] =
          action.payload?.message ?? action.error?.message ?? 'Failed to load lists';
      })
      .addCase(createList.pending, (state, action) => {
        state.createStatus = 'loading';
        state.createError = null;
        state.creatingBoardId = action.meta.arg.board;
      })
      .addCase(createList.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.creatingBoardId = null;
        const list = action.payload;
        state.entities[list.id] = list;
        if (!state.idsByBoard[list.board]) {
          state.idsByBoard[list.board] = [];
        }
        state.idsByBoard[list.board] = sortIdsByPosition(
          [...state.idsByBoard[list.board], list.id],
          state.entities,
        );
      })
      .addCase(createList.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.creatingBoardId = null;
        state.createError = action.payload ?? action.error?.message ?? 'Failed to create list';
      })
      .addCase(updateList.pending, (state, action) => {
        state.updateStatus = 'loading';
        state.updateError = null;
        state.updatingId = action.meta.arg.id;
      })
      .addCase(updateList.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        state.updatingId = null;
        const list = action.payload;
        state.entities[list.id] = list;
        if (!state.idsByBoard[list.board]) {
          state.idsByBoard[list.board] = [list.id];
        }
        state.idsByBoard[list.board] = sortIdsByPosition(
          state.idsByBoard[list.board],
          state.entities,
        );
      })
      .addCase(updateList.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updatingId = null;
        state.updateError = action.payload ?? action.error?.message ?? 'Failed to update list';
      })
      .addCase(deleteList.pending, (state, action) => {
        state.deleteStatus = 'loading';
        state.deleteError = null;
        state.deletingId = action.meta.arg.id;
      })
      .addCase(deleteList.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        const listId = action.payload;
        state.deletingId = null;
        const boardId = state.entities[listId]?.board;
        delete state.entities[listId];
        if (boardId && state.idsByBoard[boardId]) {
          state.idsByBoard[boardId] = state.idsByBoard[boardId].filter((id) => id !== listId);
        }
      })
      .addCase(deleteList.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.deletingId = null;
        state.deleteError = action.payload ?? action.error?.message ?? 'Failed to delete list';
      })
      .addCase(reorderLists.pending, (state) => {
        state.reorderStatus = 'loading';
        state.reorderError = null;
      })
      .addCase(reorderLists.fulfilled, (state, action) => {
        state.reorderStatus = 'succeeded';
        state.reorderError = null;
        const { boardId, lists } = action.payload;
        state.idsByBoard[boardId] = lists.map((list) => list.id);
        lists.forEach((list) => {
          state.entities[list.id] = list;
        });
      })
      .addCase(reorderLists.rejected, (state, action) => {
        state.reorderStatus = 'failed';
        state.reorderError = action.payload?.message ?? 'Failed to reorder lists';
        // Revert optimistic update - refetch will be triggered
      })
      .addCase(clearSession, () => buildInitialState());
  },
});

export const listsReducer = listsSlice.reducer;
export const { clearListsState, optimisticReorderLists } = listsSlice.actions;
export const selectLists = (state) => state.lists;
export const createListsInitialState = () => buildInitialState();

export default listsReducer;

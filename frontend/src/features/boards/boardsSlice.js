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
  items: [],
  status: 'idle',
  error: null,
  createStatus: 'idle',
  createError: null,
  updateStatus: 'idle',
  updateError: null,
  updatingId: null,
  deleteStatus: 'idle',
  deleteError: null,
  deletingId: null,
  selectedBoard: null,
  selectedStatus: 'idle',
  selectedError: null,
});

const initialState = buildInitialState();

export const fetchBoards = createAsyncThunk('boards/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await httpClient.get('/boards');
    return data.boards ?? [];
  } catch (error) {
    return rejectWithValue(extractErrorMessage(error));
  }
});

export const createBoard = createAsyncThunk(
  'boards/create',
  async ({ title, description }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.post('/boards', { title, description });
      return data.board;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const updateBoard = createAsyncThunk(
  'boards/update',
  async ({ id, changes }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.patch(`/boards/${id}`, changes);
      return data.board;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const deleteBoard = createAsyncThunk(
  'boards/delete',
  async ({ id }, { rejectWithValue }) => {
    try {
      await httpClient.delete(`/boards/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const fetchBoardById = createAsyncThunk(
  'boards/fetchById',
  async ({ id }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get(`/boards/${id}`);
      return data.board;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

const boardsSlice = createSlice({
  name: 'boards',
  initialState,
  reducers: {
    clearBoardsState: () => buildInitialState(),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBoards.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.items = action.payload;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error?.message ?? 'Failed to load boards';
      })
      .addCase(createBoard.pending, (state) => {
        state.createStatus = 'loading';
        state.createError = null;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        state.createStatus = 'succeeded';
        state.items = [action.payload, ...state.items];
      })
      .addCase(createBoard.rejected, (state, action) => {
        state.createStatus = 'failed';
        state.createError = action.payload ?? action.error?.message ?? 'Failed to create board';
      })
      .addCase(updateBoard.pending, (state, action) => {
        state.updateStatus = 'loading';
        state.updateError = null;
        state.updatingId = action.meta.arg.id;
      })
      .addCase(updateBoard.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        state.updatingId = null;
        state.items = state.items.map((board) =>
          board.id === action.payload.id ? action.payload : board,
        );
        if (state.selectedBoard?.id === action.payload.id) {
          state.selectedBoard = action.payload;
        }
      })
      .addCase(updateBoard.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updatingId = null;
        state.updateError = action.payload ?? action.error?.message ?? 'Failed to update board';
      })
      .addCase(deleteBoard.pending, (state, action) => {
        state.deleteStatus = 'loading';
        state.deleteError = null;
        state.deletingId = action.meta.arg.id;
      })
      .addCase(deleteBoard.fulfilled, (state, action) => {
        state.deleteStatus = 'succeeded';
        state.deletingId = null;
        state.items = state.items.filter((board) => board.id !== action.payload);
        if (state.selectedBoard?.id === action.payload) {
          state.selectedBoard = null;
        }
      })
      .addCase(deleteBoard.rejected, (state, action) => {
        state.deleteStatus = 'failed';
        state.deletingId = null;
        state.deleteError = action.payload ?? action.error?.message ?? 'Failed to delete board';
      })
      .addCase(fetchBoardById.pending, (state) => {
        state.selectedStatus = 'loading';
        state.selectedError = null;
      })
      .addCase(fetchBoardById.fulfilled, (state, action) => {
        state.selectedStatus = 'succeeded';
        state.selectedBoard = action.payload;
      })
      .addCase(fetchBoardById.rejected, (state, action) => {
        state.selectedStatus = 'failed';
        state.selectedBoard = null;
        state.selectedError =
          action.payload ?? action.error?.message ?? 'Failed to load board details';
      })
      .addCase(clearSession, () => buildInitialState());
  },
});

export const boardsReducer = boardsSlice.reducer;
export const { clearBoardsState } = boardsSlice.actions;
export const selectBoards = (state) => state.boards;
export const createBoardsInitialState = () => buildInitialState();

export default boardsReducer;

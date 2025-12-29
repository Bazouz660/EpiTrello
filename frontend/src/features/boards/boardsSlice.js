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
  // Member management state
  membersStatus: 'idle',
  membersError: null,
  members: [],
  addMemberStatus: 'idle',
  addMemberError: null,
  removeMemberStatus: 'idle',
  removeMemberError: null,
  updateMemberStatus: 'idle',
  updateMemberError: null,
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
  async ({ title, description, background }, { rejectWithValue }) => {
    try {
      const payload = { title, description };
      if (background) {
        payload.background = background;
      }
      const { data } = await httpClient.post('/boards', payload);
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

export const fetchBoardMembers = createAsyncThunk(
  'boards/fetchMembers',
  async ({ boardId }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get(`/boards/${boardId}/members`);
      return data.members ?? [];
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const addBoardMember = createAsyncThunk(
  'boards/addMember',
  async ({ boardId, userId, role = 'member' }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.post(`/boards/${boardId}/members`, { userId, role });
      return { board: data.board, members: data.members };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const updateBoardMember = createAsyncThunk(
  'boards/updateMember',
  async ({ boardId, userId, role }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.patch(`/boards/${boardId}/members/${userId}`, { role });
      return { board: data.board, members: data.members };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const removeBoardMember = createAsyncThunk(
  'boards/removeMember',
  async ({ boardId, userId }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.delete(`/boards/${boardId}/members/${userId}`);
      return { board: data.board, members: data.members };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const searchUsers = createAsyncThunk(
  'boards/searchUsers',
  async ({ query }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get(`/users/search?q=${encodeURIComponent(query)}`);
      return data.users ?? [];
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
    clearMemberErrors: (state) => {
      state.addMemberError = null;
      state.removeMemberError = null;
      state.updateMemberError = null;
    },
    // Real-time sync actions
    boardUpdatedFromSocket: (state, action) => {
      const { board } = action.payload;
      // Update in items list
      const itemIndex = state.items.findIndex((b) => b.id === board.id);
      if (itemIndex !== -1) {
        state.items[itemIndex] = board;
      }
      // Update selected board if it's the current one
      if (state.selectedBoard?.id === board.id) {
        state.selectedBoard = board;
      }
    },
    boardDeletedFromSocket: (state, action) => {
      const { boardId } = action.payload;
      state.items = state.items.filter((b) => b.id !== boardId);
      if (state.selectedBoard?.id === boardId) {
        state.selectedBoard = null;
      }
    },
    boardMembersUpdatedFromSocket: (state, action) => {
      const { members } = action.payload;
      state.members = members;
    },
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
      // Member management
      .addCase(fetchBoardMembers.pending, (state) => {
        state.membersStatus = 'loading';
        state.membersError = null;
      })
      .addCase(fetchBoardMembers.fulfilled, (state, action) => {
        state.membersStatus = 'succeeded';
        state.members = action.payload;
      })
      .addCase(fetchBoardMembers.rejected, (state, action) => {
        state.membersStatus = 'failed';
        state.membersError = action.payload ?? action.error?.message ?? 'Failed to load members';
      })
      .addCase(addBoardMember.pending, (state) => {
        state.addMemberStatus = 'loading';
        state.addMemberError = null;
      })
      .addCase(addBoardMember.fulfilled, (state, action) => {
        state.addMemberStatus = 'succeeded';
        if (state.selectedBoard?.id === action.payload.board.id) {
          state.selectedBoard = action.payload.board;
        }
        state.items = state.items.map((board) =>
          board.id === action.payload.board.id ? action.payload.board : board,
        );
        // Update members list with populated data
        state.members = action.payload.members;
      })
      .addCase(addBoardMember.rejected, (state, action) => {
        state.addMemberStatus = 'failed';
        state.addMemberError = action.payload ?? action.error?.message ?? 'Failed to add member';
      })
      .addCase(updateBoardMember.pending, (state) => {
        state.updateMemberStatus = 'loading';
        state.updateMemberError = null;
      })
      .addCase(updateBoardMember.fulfilled, (state, action) => {
        state.updateMemberStatus = 'succeeded';
        if (state.selectedBoard?.id === action.payload.board.id) {
          state.selectedBoard = action.payload.board;
        }
        state.items = state.items.map((board) =>
          board.id === action.payload.board.id ? action.payload.board : board,
        );
        // Update members list with populated data
        state.members = action.payload.members;
      })
      .addCase(updateBoardMember.rejected, (state, action) => {
        state.updateMemberStatus = 'failed';
        state.updateMemberError =
          action.payload ?? action.error?.message ?? 'Failed to update member';
      })
      .addCase(removeBoardMember.pending, (state) => {
        state.removeMemberStatus = 'loading';
        state.removeMemberError = null;
      })
      .addCase(removeBoardMember.fulfilled, (state, action) => {
        state.removeMemberStatus = 'succeeded';
        if (state.selectedBoard?.id === action.payload.board.id) {
          state.selectedBoard = action.payload.board;
        }
        state.items = state.items.map((board) =>
          board.id === action.payload.board.id ? action.payload.board : board,
        );
        // Update members list with populated data
        state.members = action.payload.members;
      })
      .addCase(removeBoardMember.rejected, (state, action) => {
        state.removeMemberStatus = 'failed';
        state.removeMemberError =
          action.payload ?? action.error?.message ?? 'Failed to remove member';
      })
      .addCase(clearSession, () => buildInitialState());
  },
});

export const boardsReducer = boardsSlice.reducer;
export const {
  clearBoardsState,
  clearMemberErrors,
  boardUpdatedFromSocket,
  boardDeletedFromSocket,
  boardMembersUpdatedFromSocket,
} = boardsSlice.actions;
export const selectBoards = (state) => state.boards;
export const createBoardsInitialState = () => buildInitialState();

export default boardsReducer;

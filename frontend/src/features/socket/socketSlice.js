import { createSlice } from '@reduxjs/toolkit';

import { clearSession } from '../auth/authSlice.js';

const buildInitialState = () => ({
  // Connection state
  status: 'disconnected', // 'disconnected' | 'connecting' | 'connected' | 'error'
  error: null,
  socketId: null,

  // Board room state
  currentBoardId: null,
  joinedAt: null,

  // Online users in current board
  onlineUsers: [],

  // Reconnection state
  reconnectAttempts: 0,
  lastDisconnectReason: null,
});

const initialState = buildInitialState();

const socketSlice = createSlice({
  name: 'socket',
  initialState,
  reducers: {
    // Connection lifecycle
    connectionStarted: (state) => {
      state.status = 'connecting';
      state.error = null;
    },
    connectionEstablished: (state, action) => {
      state.status = 'connected';
      state.socketId = action.payload.socketId;
      state.error = null;
      state.reconnectAttempts = 0;
    },
    connectionFailed: (state, action) => {
      state.status = 'error';
      state.error = action.payload.error;
      state.socketId = null;
    },
    disconnected: (state, action) => {
      state.status = 'disconnected';
      state.socketId = null;
      state.lastDisconnectReason = action.payload?.reason ?? null;
    },
    reconnecting: (state) => {
      state.status = 'connecting';
      state.reconnectAttempts += 1;
    },

    // Board room management
    boardJoined: (state, action) => {
      state.currentBoardId = action.payload.boardId;
      state.joinedAt = new Date().toISOString();
    },
    boardLeft: (state) => {
      state.currentBoardId = null;
      state.joinedAt = null;
      state.onlineUsers = [];
    },

    // Online users tracking
    userJoinedBoard: (state, action) => {
      const { userId, username, avatarUrl } = action.payload;
      const exists = state.onlineUsers.some((u) => u.userId === userId);
      if (!exists) {
        state.onlineUsers.push({ userId, username, avatarUrl, joinedAt: new Date().toISOString() });
      }
    },
    userLeftBoard: (state, action) => {
      const { userId } = action.payload;
      state.onlineUsers = state.onlineUsers.filter((u) => u.userId !== userId);
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },

    // Reset state
    resetSocketState: () => buildInitialState(),
  },
  extraReducers: (builder) => {
    builder.addCase(clearSession, () => buildInitialState());
  },
});

export const {
  connectionStarted,
  connectionEstablished,
  connectionFailed,
  disconnected,
  reconnecting,
  boardJoined,
  boardLeft,
  userJoinedBoard,
  userLeftBoard,
  setOnlineUsers,
  resetSocketState,
} = socketSlice.actions;

export const socketReducer = socketSlice.reducer;
export const selectSocket = (state) => state.socket;
export const selectSocketStatus = (state) => state.socket.status;
export const selectIsConnected = (state) => state.socket.status === 'connected';
export const selectCurrentBoardId = (state) => state.socket.currentBoardId;
export const selectOnlineUsers = (state) => state.socket.onlineUsers;

export default socketReducer;

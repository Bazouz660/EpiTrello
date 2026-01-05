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

  // Cursor positions of other users: { [userId]: { x, y, username, avatarUrl, lastUpdate } }
  cursorPositions: {},

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
      // Set initial online users from payload if available
      if (action.payload.activeUsers) {
        state.onlineUsers = action.payload.activeUsers;
      }
    },
    boardLeft: (state) => {
      state.currentBoardId = null;
      state.joinedAt = null;
      state.onlineUsers = [];
      state.cursorPositions = {};
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
      // Remove cursor position when user leaves
      delete state.cursorPositions[userId];
    },
    setOnlineUsers: (state, action) => {
      state.onlineUsers = action.payload;
    },

    // Cursor position tracking
    cursorPositionUpdated: (state, action) => {
      const { userId, username, avatarUrl, x, y } = action.payload;
      state.cursorPositions[userId] = {
        x,
        y,
        username,
        avatarUrl,
        lastUpdate: Date.now(),
      };
    },
    removeCursorPosition: (state, action) => {
      const { userId } = action.payload;
      delete state.cursorPositions[userId];
    },
    clearStaleCursors: (state, action) => {
      const staleThreshold = action.payload?.threshold ?? 5000; // 5 seconds default
      const now = Date.now();
      for (const userId of Object.keys(state.cursorPositions)) {
        if (now - state.cursorPositions[userId].lastUpdate > staleThreshold) {
          delete state.cursorPositions[userId];
        }
      }
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
  cursorPositionUpdated,
  removeCursorPosition,
  clearStaleCursors,
  resetSocketState,
} = socketSlice.actions;

export const socketReducer = socketSlice.reducer;
export const selectSocket = (state) => state.socket;
export const selectSocketStatus = (state) => state.socket.status;
export const selectIsConnected = (state) => state.socket.status === 'connected';
export const selectCurrentBoardId = (state) => state.socket.currentBoardId;
export const selectOnlineUsers = (state) => state.socket.onlineUsers;
export const selectCursorPositions = (state) => state.socket.cursorPositions;

export default socketReducer;

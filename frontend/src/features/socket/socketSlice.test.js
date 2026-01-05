import { describe, it, expect, beforeEach } from 'vitest';

import { clearSession } from '../auth/authSlice.js';

import {
  socketReducer,
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
  selectSocket,
  selectSocketStatus,
  selectIsConnected,
  selectCurrentBoardId,
  selectOnlineUsers,
  selectCursorPositions,
} from './socketSlice.js';

describe('socketSlice', () => {
  let initialState;

  beforeEach(() => {
    initialState = socketReducer(undefined, { type: 'unknown' });
  });

  describe('initial state', () => {
    it('should return the initial state', () => {
      expect(initialState.status).toBe('disconnected');
      expect(initialState.error).toBeNull();
      expect(initialState.socketId).toBeNull();
      expect(initialState.currentBoardId).toBeNull();
      expect(initialState.onlineUsers).toEqual([]);
      expect(initialState.cursorPositions).toEqual({});
      expect(initialState.reconnectAttempts).toBe(0);
    });
  });

  describe('connection lifecycle', () => {
    it('should handle connectionStarted', () => {
      const state = socketReducer(initialState, connectionStarted());
      expect(state.status).toBe('connecting');
      expect(state.error).toBeNull();
    });

    it('should handle connectionEstablished', () => {
      const state = socketReducer(
        { ...initialState, status: 'connecting', reconnectAttempts: 3 },
        connectionEstablished({ socketId: 'socket-123' }),
      );
      expect(state.status).toBe('connected');
      expect(state.socketId).toBe('socket-123');
      expect(state.error).toBeNull();
      expect(state.reconnectAttempts).toBe(0);
    });

    it('should handle connectionFailed', () => {
      const state = socketReducer(
        { ...initialState, status: 'connecting' },
        connectionFailed({ error: 'Connection timeout' }),
      );
      expect(state.status).toBe('error');
      expect(state.error).toBe('Connection timeout');
      expect(state.socketId).toBeNull();
    });

    it('should handle disconnected', () => {
      const state = socketReducer(
        { ...initialState, status: 'connected', socketId: 'socket-123' },
        disconnected({ reason: 'transport close' }),
      );
      expect(state.status).toBe('disconnected');
      expect(state.socketId).toBeNull();
      expect(state.lastDisconnectReason).toBe('transport close');
    });

    it('should handle disconnected without reason', () => {
      const state = socketReducer(
        { ...initialState, status: 'connected', socketId: 'socket-123' },
        disconnected(),
      );
      expect(state.status).toBe('disconnected');
      expect(state.socketId).toBeNull();
      expect(state.lastDisconnectReason).toBeNull();
    });

    it('should handle disconnected with empty payload', () => {
      const state = socketReducer(
        { ...initialState, status: 'connected', socketId: 'socket-123' },
        disconnected({}),
      );
      expect(state.status).toBe('disconnected');
      expect(state.lastDisconnectReason).toBeNull();
    });

    it('should handle reconnecting', () => {
      const state = socketReducer(
        { ...initialState, status: 'disconnected', reconnectAttempts: 2 },
        reconnecting(),
      );
      expect(state.status).toBe('connecting');
      expect(state.reconnectAttempts).toBe(3);
    });
  });

  describe('board room management', () => {
    it('should handle boardJoined', () => {
      const state = socketReducer(initialState, boardJoined({ boardId: 'board-123' }));
      expect(state.currentBoardId).toBe('board-123');
      expect(state.joinedAt).toBeTruthy();
    });

    it('should handle boardJoined with activeUsers', () => {
      const activeUsers = [
        { userId: 'user-1', username: 'User 1', avatarUrl: null },
        { userId: 'user-2', username: 'User 2', avatarUrl: null },
      ];
      const state = socketReducer(initialState, boardJoined({ boardId: 'board-123', activeUsers }));
      expect(state.currentBoardId).toBe('board-123');
      expect(state.onlineUsers).toEqual(activeUsers);
    });

    it('should handle boardLeft', () => {
      const state = socketReducer(
        {
          ...initialState,
          currentBoardId: 'board-123',
          joinedAt: new Date().toISOString(),
          onlineUsers: [{ userId: 'user-1', username: 'Test User' }],
          cursorPositions: { 'user-1': { x: 50, y: 50 } },
        },
        boardLeft(),
      );
      expect(state.currentBoardId).toBeNull();
      expect(state.joinedAt).toBeNull();
      expect(state.onlineUsers).toEqual([]);
      expect(state.cursorPositions).toEqual({});
    });
  });

  describe('online users tracking', () => {
    it('should handle userJoinedBoard', () => {
      const state = socketReducer(
        initialState,
        userJoinedBoard({ userId: 'user-123', username: 'Test User', avatarUrl: null }),
      );
      expect(state.onlineUsers).toHaveLength(1);
      expect(state.onlineUsers[0].userId).toBe('user-123');
      expect(state.onlineUsers[0].username).toBe('Test User');
    });

    it('should not add duplicate users', () => {
      const stateWithUser = socketReducer(
        initialState,
        userJoinedBoard({ userId: 'user-123', username: 'Test User' }),
      );
      const state = socketReducer(
        stateWithUser,
        userJoinedBoard({ userId: 'user-123', username: 'Test User' }),
      );
      expect(state.onlineUsers).toHaveLength(1);
    });

    it('should handle userLeftBoard', () => {
      const stateWithUsers = {
        ...initialState,
        onlineUsers: [
          { userId: 'user-1', username: 'User 1' },
          { userId: 'user-2', username: 'User 2' },
        ],
        cursorPositions: {
          'user-1': { x: 25, y: 25, username: 'User 1', lastUpdate: Date.now() },
          'user-2': { x: 75, y: 75, username: 'User 2', lastUpdate: Date.now() },
        },
      };
      const state = socketReducer(stateWithUsers, userLeftBoard({ userId: 'user-1' }));
      expect(state.onlineUsers).toHaveLength(1);
      expect(state.onlineUsers[0].userId).toBe('user-2');
      expect(state.cursorPositions['user-1']).toBeUndefined();
      expect(state.cursorPositions['user-2']).toBeDefined();
    });

    it('should handle setOnlineUsers', () => {
      const users = [
        { userId: 'user-1', username: 'User 1' },
        { userId: 'user-2', username: 'User 2' },
      ];
      const state = socketReducer(initialState, setOnlineUsers(users));
      expect(state.onlineUsers).toEqual(users);
    });
  });

  describe('cursor position tracking', () => {
    it('should handle cursorPositionUpdated', () => {
      const state = socketReducer(
        initialState,
        cursorPositionUpdated({
          userId: 'user-1',
          username: 'User 1',
          avatarUrl: 'https://example.com/avatar.jpg',
          x: 50,
          y: 75,
        }),
      );
      expect(state.cursorPositions['user-1']).toBeDefined();
      expect(state.cursorPositions['user-1'].x).toBe(50);
      expect(state.cursorPositions['user-1'].y).toBe(75);
      expect(state.cursorPositions['user-1'].username).toBe('User 1');
      expect(state.cursorPositions['user-1'].avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(state.cursorPositions['user-1'].lastUpdate).toBeDefined();
    });

    it('should update existing cursor position', () => {
      const stateWithCursor = {
        ...initialState,
        cursorPositions: {
          'user-1': { x: 25, y: 25, username: 'User 1', avatarUrl: null, lastUpdate: 1000 },
        },
      };
      const state = socketReducer(
        stateWithCursor,
        cursorPositionUpdated({
          userId: 'user-1',
          username: 'User 1',
          avatarUrl: null,
          x: 75,
          y: 80,
        }),
      );
      expect(state.cursorPositions['user-1'].x).toBe(75);
      expect(state.cursorPositions['user-1'].y).toBe(80);
    });

    it('should handle removeCursorPosition', () => {
      const stateWithCursors = {
        ...initialState,
        cursorPositions: {
          'user-1': { x: 25, y: 25, username: 'User 1', lastUpdate: Date.now() },
          'user-2': { x: 75, y: 75, username: 'User 2', lastUpdate: Date.now() },
        },
      };
      const state = socketReducer(stateWithCursors, removeCursorPosition({ userId: 'user-1' }));
      expect(state.cursorPositions['user-1']).toBeUndefined();
      expect(state.cursorPositions['user-2']).toBeDefined();
    });

    it('should handle clearStaleCursors with default threshold', () => {
      const now = Date.now();
      const stateWithCursors = {
        ...initialState,
        cursorPositions: {
          'user-1': { x: 25, y: 25, username: 'User 1', lastUpdate: now - 6000 }, // stale (6s old)
          'user-2': { x: 75, y: 75, username: 'User 2', lastUpdate: now - 1000 }, // fresh (1s old)
        },
      };
      const state = socketReducer(stateWithCursors, clearStaleCursors());
      expect(state.cursorPositions['user-1']).toBeUndefined();
      expect(state.cursorPositions['user-2']).toBeDefined();
    });

    it('should handle clearStaleCursors with custom threshold', () => {
      const now = Date.now();
      const stateWithCursors = {
        ...initialState,
        cursorPositions: {
          'user-1': { x: 25, y: 25, username: 'User 1', lastUpdate: now - 3000 }, // stale with 2s threshold
          'user-2': { x: 75, y: 75, username: 'User 2', lastUpdate: now - 1000 }, // fresh
        },
      };
      const state = socketReducer(stateWithCursors, clearStaleCursors({ threshold: 2000 }));
      expect(state.cursorPositions['user-1']).toBeUndefined();
      expect(state.cursorPositions['user-2']).toBeDefined();
    });
  });

  describe('reset actions', () => {
    it('should handle resetSocketState', () => {
      const modifiedState = {
        ...initialState,
        status: 'connected',
        socketId: 'socket-123',
        currentBoardId: 'board-123',
        onlineUsers: [{ userId: 'user-1' }],
      };
      const state = socketReducer(modifiedState, resetSocketState());
      expect(state.status).toBe('disconnected');
      expect(state.socketId).toBeNull();
      expect(state.currentBoardId).toBeNull();
      expect(state.onlineUsers).toEqual([]);
    });

    it('should reset state on clearSession', () => {
      const modifiedState = {
        ...initialState,
        status: 'connected',
        socketId: 'socket-123',
      };
      const state = socketReducer(modifiedState, clearSession());
      expect(state.status).toBe('disconnected');
      expect(state.socketId).toBeNull();
    });
  });

  describe('selectors', () => {
    const mockRootState = {
      socket: {
        status: 'connected',
        error: null,
        socketId: 'socket-123',
        currentBoardId: 'board-456',
        onlineUsers: [{ userId: 'user-1', username: 'User 1' }],
        cursorPositions: {
          'user-2': { x: 50, y: 50, username: 'User 2', lastUpdate: Date.now() },
        },
      },
    };

    it('selectSocket should return socket state', () => {
      expect(selectSocket(mockRootState)).toEqual(mockRootState.socket);
    });

    it('selectSocketStatus should return status', () => {
      expect(selectSocketStatus(mockRootState)).toBe('connected');
    });

    it('selectIsConnected should return true when connected', () => {
      expect(selectIsConnected(mockRootState)).toBe(true);
    });

    it('selectIsConnected should return false when not connected', () => {
      const disconnectedState = { socket: { status: 'disconnected' } };
      expect(selectIsConnected(disconnectedState)).toBe(false);
    });

    it('selectCurrentBoardId should return board ID', () => {
      expect(selectCurrentBoardId(mockRootState)).toBe('board-456');
    });

    it('selectOnlineUsers should return online users', () => {
      expect(selectOnlineUsers(mockRootState)).toEqual([{ userId: 'user-1', username: 'User 1' }]);
    });

    it('selectCursorPositions should return cursor positions', () => {
      expect(selectCursorPositions(mockRootState)).toEqual(mockRootState.socket.cursorPositions);
    });
  });
});

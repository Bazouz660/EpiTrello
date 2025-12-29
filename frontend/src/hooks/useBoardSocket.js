import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  boardUpdatedFromSocket,
  boardDeletedFromSocket,
  boardMembersUpdatedFromSocket,
} from '../features/boards/boardsSlice.js';
import {
  cardCreatedFromSocket,
  cardUpdatedFromSocket,
  cardDeletedFromSocket,
  cardMovedFromSocket,
} from '../features/cards/cardsSlice.js';
import {
  listCreatedFromSocket,
  listUpdatedFromSocket,
  listDeletedFromSocket,
  listsReorderedFromSocket,
} from '../features/lists/listsSlice.js';
import {
  connectionStarted,
  connectionEstablished,
  connectionFailed,
  disconnected,
  reconnecting,
  boardJoined,
  boardLeft,
  userJoinedBoard,
  userLeftBoard,
} from '../features/socket/socketSlice.js';
import {
  connectSocket,
  disconnectSocket,
  joinBoard,
  leaveBoard,
  getSocket,
  subscribeToEvents,
} from '../services/socketService.js';

import { useAppDispatch, useAppSelector } from './index.js';

/**
 * Custom hook to manage WebSocket connection for real-time board updates
 * @param {string} boardId - The board ID to connect to
 * @param {string} token - JWT authentication token
 * @returns {Object} Socket connection state and controls
 */
export const useBoardSocket = (boardId, token) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const socketState = useAppSelector((state) => state.socket);
  const currentUserId = useAppSelector((state) => state.auth.user?.id);
  const hasConnectedRef = useRef(false);
  const unsubscribeRef = useRef(null);

  // Set up socket event handlers
  const setupEventHandlers = useCallback(() => {
    const socket = getSocket();
    if (!socket) return null;

    const eventHandlers = {
      // Board events
      'board:updated': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(boardUpdatedFromSocket(data));
        }
      },
      'board:deleted': (data) => {
        dispatch(boardDeletedFromSocket(data));
        // Navigate away if board is deleted
        navigate('/boards', { replace: true });
      },

      // Member events
      'board:member-added': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(boardMembersUpdatedFromSocket(data));
        }
      },
      'board:member-updated': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(boardMembersUpdatedFromSocket(data));
        }
      },
      'board:member-removed': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(boardMembersUpdatedFromSocket(data));
        }
        // If current user was removed, navigate away
        if (data.removedUserId === currentUserId) {
          navigate('/boards', { replace: true });
        }
      },

      // User presence events
      'board:user-joined': (data) => {
        dispatch(userJoinedBoard(data));
      },
      'board:user-left': (data) => {
        dispatch(userLeftBoard(data));
      },

      // List events
      'list:created': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(listCreatedFromSocket(data));
        }
      },
      'list:updated': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(listUpdatedFromSocket(data));
        }
      },
      'list:deleted': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(listDeletedFromSocket(data));
        }
      },
      'lists:reordered': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(listsReorderedFromSocket(data));
        }
      },

      // Card events
      'card:created': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(cardCreatedFromSocket(data));
        }
      },
      'card:updated': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(cardUpdatedFromSocket(data));
        }
      },
      'card:deleted': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(cardDeletedFromSocket(data));
        }
      },
      'card:moved': (data) => {
        if (data.userId !== currentUserId) {
          dispatch(cardMovedFromSocket(data));
        }
      },

      // Connection events
      disconnect: (reason) => {
        dispatch(disconnected({ reason }));
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, might need to reconnect
          dispatch(reconnecting());
        }
      },
      reconnect: () => {
        dispatch(connectionEstablished({ socketId: socket.id }));
        // Rejoin the board room after reconnecting
        if (boardId) {
          joinBoard(boardId)
            .then(() => dispatch(boardJoined({ boardId })))
            .catch((error) => console.error('Failed to rejoin board:', error));
        }
      },
      reconnect_attempt: () => {
        dispatch(reconnecting());
      },
      connect_error: (error) => {
        dispatch(connectionFailed({ error: error.message }));
      },
    };

    return subscribeToEvents(eventHandlers);
  }, [currentUserId, boardId, dispatch, navigate]);

  // Connect to socket and join board room
  useEffect(() => {
    if (!boardId || !token || hasConnectedRef.current) return;

    const connect = async () => {
      try {
        dispatch(connectionStarted());
        const socket = await connectSocket(token);
        dispatch(connectionEstablished({ socketId: socket.id }));

        // Set up event handlers
        unsubscribeRef.current = setupEventHandlers();

        // Join the board room
        await joinBoard(boardId);
        dispatch(boardJoined({ boardId }));
        hasConnectedRef.current = true;
      } catch (error) {
        console.error('Socket connection failed:', error);
        dispatch(connectionFailed({ error: error.message }));
      }
    };

    connect();

    // Cleanup on unmount or when boardId/token changes
    return () => {
      if (boardId && hasConnectedRef.current) {
        leaveBoard(boardId);
        dispatch(boardLeft());
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      hasConnectedRef.current = false;
    };
  }, [boardId, token, dispatch, setupEventHandlers]);

  // Disconnect socket on component unmount (final cleanup)
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return {
    status: socketState.status,
    isConnected: socketState.status === 'connected',
    error: socketState.error,
    onlineUsers: socketState.onlineUsers,
    reconnectAttempts: socketState.reconnectAttempts,
  };
};

export default useBoardSocket;

import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api', '') ?? 'http://localhost:5000';

let socket = null;
let connectionPromise = null;

/**
 * Initialize and connect to the WebSocket server
 * @param {string} token - JWT authentication token
 * @returns {Promise<Socket>} Connected socket instance
 */
export const connectSocket = (token) => {
  // If already connected with a socket, return it
  if (socket?.connected) {
    return Promise.resolve(socket);
  }

  // If connection is in progress, return the existing promise
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = new Promise((resolve, reject) => {
    socket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      timeout: 10000,
    });

    const onConnect = () => {
      console.debug('[Socket] Connected:', socket.id);
      cleanup();
      resolve(socket);
    };

    const onConnectError = (error) => {
      console.error('[Socket] Connection error:', error.message);
      cleanup();
      reject(error);
    };

    const cleanup = () => {
      socket.off('connect', onConnect);
      socket.off('connect_error', onConnectError);
      connectionPromise = null;
    };

    socket.on('connect', onConnect);
    socket.on('connect_error', onConnectError);
  });

  return connectionPromise;
};

/**
 * Disconnect from the WebSocket server
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    connectionPromise = null;
  }
};

/**
 * Get the current socket instance
 * @returns {Socket|null}
 */
export const getSocket = () => socket;

/**
 * Check if socket is connected
 * @returns {boolean}
 */
export const isConnected = () => socket?.connected ?? false;

/**
 * Join a board room to receive real-time updates
 * @param {string} boardId - The board ID to join
 * @returns {Promise<void>}
 */
export const joinBoard = (boardId) => {
  return new Promise((resolve, reject) => {
    if (!socket?.connected) {
      reject(new Error('Socket not connected'));
      return;
    }

    const timeout = setTimeout(() => {
      socket.off('board:joined', onJoined);
      socket.off('error', onError);
      reject(new Error('Join board timeout'));
    }, 5000);

    const onJoined = (data) => {
      clearTimeout(timeout);
      socket.off('error', onError);
      console.debug('[Socket] Joined board:', data.boardId);
      resolve(data);
    };

    const onError = (error) => {
      clearTimeout(timeout);
      socket.off('board:joined', onJoined);
      console.error('[Socket] Join board error:', error);
      reject(new Error(error.message));
    };

    socket.once('board:joined', onJoined);
    socket.once('error', onError);
    socket.emit('board:join', boardId);
  });
};

/**
 * Leave a board room
 * @param {string} boardId - The board ID to leave
 */
export const leaveBoard = (boardId) => {
  if (socket?.connected) {
    socket.emit('board:leave', boardId);
    console.debug('[Socket] Left board:', boardId);
  }
};

/**
 * Send cursor position update to the board
 * @param {string} boardId - The board ID
 * @param {number} x - X coordinate (percentage 0-100)
 * @param {number} y - Y coordinate (percentage 0-100)
 */
export const sendCursorPosition = (boardId, x, y) => {
  if (socket?.connected && boardId) {
    socket.emit('cursor:move', { boardId, x, y });
  }
};

/**
 * Subscribe to a socket event
 * @param {string} event - Event name
 * @param {Function} callback - Event handler
 * @returns {Function} Unsubscribe function
 */
export const subscribe = (event, callback) => {
  if (!socket) {
    console.warn('[Socket] Cannot subscribe, socket not initialized');
    return () => {};
  }

  socket.on(event, callback);
  return () => socket.off(event, callback);
};

/**
 * Subscribe to multiple events at once
 * @param {Object.<string, Function>} eventHandlers - Map of event names to handlers
 * @returns {Function} Unsubscribe function for all events
 */
export const subscribeToEvents = (eventHandlers) => {
  const unsubscribers = Object.entries(eventHandlers).map(([event, handler]) =>
    subscribe(event, handler),
  );

  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  isConnected,
  joinBoard,
  leaveBoard,
  sendCursorPosition,
  subscribe,
  subscribeToEvents,
};

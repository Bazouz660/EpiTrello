import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { canView } from '../controllers/boardsController.js';
import { Board } from '../models/Board.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

// Store io instance for use in controllers
let ioInstance = null;

// Track active users per board room: Map<boardId, Map<socketId, userData>>
const boardActiveUsers = new Map();

/**
 * Get active users for a board
 * @param {string} boardId
 * @returns {Array} Array of active user objects
 */
const getActiveUsersForBoard = (boardId) => {
  const users = boardActiveUsers.get(boardId);
  if (!users) return [];

  // Dedupe by userId (user may have multiple sockets)
  const uniqueUsers = new Map();
  for (const userData of users.values()) {
    if (!uniqueUsers.has(userData.userId)) {
      uniqueUsers.set(userData.userId, userData);
    }
  }
  return Array.from(uniqueUsers.values());
};

/**
 * Add user to board's active users
 * @param {string} boardId
 * @param {string} socketId
 * @param {object} userData
 */
const addActiveUser = (boardId, socketId, userData) => {
  if (!boardActiveUsers.has(boardId)) {
    boardActiveUsers.set(boardId, new Map());
  }
  boardActiveUsers.get(boardId).set(socketId, {
    ...userData,
    joinedAt: new Date().toISOString(),
  });
};

/**
 * Remove user from board's active users
 * @param {string} boardId
 * @param {string} socketId
 * @returns {object|null} The removed user data
 */
const removeActiveUser = (boardId, socketId) => {
  const boardUsers = boardActiveUsers.get(boardId);
  if (!boardUsers) return null;

  const userData = boardUsers.get(socketId);
  boardUsers.delete(socketId);

  // Clean up empty board entries
  if (boardUsers.size === 0) {
    boardActiveUsers.delete(boardId);
  }

  return userData;
};

/**
 * Get the Socket.IO instance
 * @returns {import('socket.io').Server|null}
 */
export const getIO = () => ioInstance;

/**
 * Authenticate socket connection using JWT token
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    let payload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      return next(new Error('Invalid or expired token'));
    }

    const userId = payload.sub;
    if (!userId) {
      return next(new Error('Invalid token payload'));
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return next(new Error('User not found'));
    }

    socket.user = user;
    return next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    return next(new Error('Authentication failed'));
  }
};

/**
 * Handle socket connection and room management
 */
const handleConnection = (io, socket) => {
  logger.debug(`Socket connected: ${socket.id} (user: ${socket.user?.username})`);

  // Join user's personal notification room
  const userRoom = `user:${socket.user._id.toString()}`;
  socket.join(userRoom);
  logger.debug(`Socket ${socket.id} joined personal room ${userRoom}`);

  // Join a board room
  socket.on('board:join', async (boardId) => {
    try {
      if (!boardId) {
        socket.emit('error', { message: 'Board ID required' });
        return;
      }

      const board = await Board.findById(boardId);
      if (!board) {
        socket.emit('error', { message: 'Board not found' });
        return;
      }

      // Check if user has access to the board
      if (!canView(board, socket.user._id)) {
        socket.emit('error', { message: 'Access denied to board' });
        return;
      }

      // Leave any existing board rooms (user can only be in one board at a time)
      const existingRooms = Array.from(socket.rooms).filter((room) => room.startsWith('board:'));
      for (const room of existingRooms) {
        socket.leave(room);
        logger.debug(`Socket ${socket.id} left room ${room}`);
      }

      // Join the new board room
      const roomName = `board:${boardId}`;
      socket.join(roomName);
      logger.debug(`Socket ${socket.id} joined room ${roomName}`);

      // Track user data for active users
      const userData = {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarUrl: socket.user.avatarUrl,
      };

      // Add user to active users tracking
      addActiveUser(boardId, socket.id, userData);

      // Get current active users list for the joining user
      const activeUsers = getActiveUsersForBoard(boardId);

      // Notify the user they've joined, including current active users
      socket.emit('board:joined', {
        boardId,
        userId: socket.user._id.toString(),
        username: socket.user.username,
        activeUsers,
      });

      // Notify others in the room that a new user joined
      socket.to(roomName).emit('board:user-joined', {
        userId: socket.user._id.toString(),
        username: socket.user.username,
        avatarUrl: socket.user.avatarUrl,
      });
    } catch (error) {
      logger.error('Error joining board:', error);
      socket.emit('error', { message: 'Failed to join board' });
    }
  });

  // Leave a board room
  socket.on('board:leave', (boardId) => {
    if (!boardId) return;

    const roomName = `board:${boardId}`;

    // Remove from active users tracking
    removeActiveUser(boardId, socket.id);

    socket.leave(roomName);
    logger.debug(`Socket ${socket.id} left room ${roomName}`);

    // Notify others in the room
    socket.to(roomName).emit('board:user-left', {
      userId: socket.user._id.toString(),
      username: socket.user.username,
    });
  });

  // Handle cursor position updates
  socket.on('cursor:move', (data) => {
    const { boardId, x, y } = data;
    if (!boardId || typeof x !== 'number' || typeof y !== 'number') return;

    const roomName = `board:${boardId}`;

    // Broadcast cursor position to others in the room
    socket.to(roomName).emit('cursor:updated', {
      userId: socket.user._id.toString(),
      username: socket.user.username,
      avatarUrl: socket.user.avatarUrl,
      x,
      y,
    });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.debug(`Socket disconnected: ${socket.id} (reason: ${reason})`);

    // Get all board rooms the user was in and clean up
    const rooms = Array.from(socket.rooms).filter((room) => room.startsWith('board:'));
    for (const room of rooms) {
      const boardId = room.replace('board:', '');
      removeActiveUser(boardId, socket.id);

      io.to(room).emit('board:user-left', {
        userId: socket.user._id.toString(),
        username: socket.user.username,
      });
    }
  });
};

/**
 * Initialize Socket.IO with authentication and event handlers
 * @param {import('socket.io').Server} io
 */
export const initializeSocket = (io) => {
  ioInstance = io;

  // Use authentication middleware
  io.use(authenticateSocket);

  // Handle connections
  io.on('connection', (socket) => handleConnection(io, socket));

  logger.info('Socket.IO initialized with authentication');
};

/**
 * Broadcast an event to all users in a board room except the sender
 * @param {string} boardId - The board ID
 * @param {string} event - The event name
 * @param {object} data - The event data
 * @param {string} [excludeSocketId] - Optional socket ID to exclude from broadcast
 */
export const broadcastToBoard = (boardId, event, data, excludeSocketId = null) => {
  if (!ioInstance) {
    logger.warn('Socket.IO not initialized, cannot broadcast');
    return;
  }

  const roomName = `board:${boardId}`;

  if (excludeSocketId) {
    ioInstance.to(roomName).except(excludeSocketId).emit(event, data);
  } else {
    ioInstance.to(roomName).emit(event, data);
  }

  logger.debug(`Broadcast ${event} to ${roomName}`);
};

/**
 * Emit an event to a specific board room (including all users)
 * @param {string} boardId - The board ID
 * @param {string} event - The event name
 * @param {object} data - The event data
 */
export const emitToBoard = (boardId, event, data) => {
  if (!ioInstance) {
    logger.warn('Socket.IO not initialized, cannot emit');
    return;
  }

  const roomName = `board:${boardId}`;
  ioInstance.to(roomName).emit(event, data);
  logger.debug(`Emit ${event} to ${roomName}`);
};

/**
 * Broadcast an event to a specific user's personal room
 * @param {string} userId - The user ID
 * @param {string} event - The event name
 * @param {object} data - The event data
 */
export const broadcastToUser = (userId, event, data) => {
  if (!ioInstance) {
    logger.warn('Socket.IO not initialized, cannot broadcast to user');
    return;
  }

  const roomName = `user:${userId}`;
  ioInstance.to(roomName).emit(event, data);
  logger.debug(`Broadcast ${event} to user ${userId}`);
};

export default {
  initializeSocket,
  getIO,
  broadcastToBoard,
  emitToBoard,
  broadcastToUser,
};

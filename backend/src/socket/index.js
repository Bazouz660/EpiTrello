import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { canView } from '../controllers/boardsController.js';
import { Board } from '../models/Board.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

// Store io instance for use in controllers
let ioInstance = null;

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

      // Notify the user they've joined
      socket.emit('board:joined', {
        boardId,
        userId: socket.user._id.toString(),
        username: socket.user.username,
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
    socket.leave(roomName);
    logger.debug(`Socket ${socket.id} left room ${roomName}`);

    // Notify others in the room
    socket.to(roomName).emit('board:user-left', {
      userId: socket.user._id.toString(),
      username: socket.user.username,
    });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.debug(`Socket disconnected: ${socket.id} (reason: ${reason})`);

    // Notify all board rooms the user was in
    const rooms = Array.from(socket.rooms).filter((room) => room.startsWith('board:'));
    for (const room of rooms) {
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

export default {
  initializeSocket,
  getIO,
  broadcastToBoard,
  emitToBoard,
};

import http from 'http';

import { Server } from 'socket.io';

import app from './app.js';
import { connectToDatabase } from './config/db.js';
import { env } from './config/env.js';
import { initializeSocket } from './socket/index.js';
import { logger } from './utils/logger.js';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL,
    credentials: true,
  },
});

// Initialize socket with authentication and board room handlers
initializeSocket(io);

export const startServer = async () => {
  await connectToDatabase();

  return new Promise((resolve, reject) => {
    server
      .listen(env.PORT, () => {
        logger.info(`Backend listening on port ${env.PORT}`);
        resolve(server);
      })
      .on('error', (error) => {
        logger.error('Server startup error', error);
        reject(error);
      });
  });
};

if (process.env.NODE_ENV !== 'test') {
  startServer().catch((error) => {
    logger.error('Fatal startup error', error);
    throw error;
  });
}

export { app, server, io };

import mongoose from 'mongoose';

import { logger } from '../utils/logger.js';

import { env } from './env.js';

mongoose.set('strictQuery', true);

export const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  try {
    await mongoose.connect(env.MONGODB_URI, {
      autoIndex: true,
      maxPoolSize: 10,
    });
    logger.info('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection error', error);
    throw error;
  }
};

export const disconnectFromDatabase = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
};

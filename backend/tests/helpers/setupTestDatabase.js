import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, afterEach, beforeAll } from 'vitest';

import { connectToDatabase, disconnectFromDatabase } from '../../src/config/db.js';
import { env } from '../../src/config/env.js';

export const setupTestDatabase = () => {
  let mongo;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    const uri = mongo.getUri();
    process.env.MONGODB_URI = uri;
    env.MONGODB_URI = uri;
    await connectToDatabase();
  });

  afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db.dropDatabase();
    }
  });

  afterAll(async () => {
    await disconnectFromDatabase();
    if (mongo) {
      await mongo.stop();
    }
  });
};

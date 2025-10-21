import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import mongoose from 'mongoose';

import { connectToDatabase, disconnectFromDatabase } from '../src/config/db.js';

vi.mock('../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn()
  }
}));

const originalDescriptor = Object.getOwnPropertyDescriptor(mongoose.connection, 'readyState');

const setReadyState = (value) => {
  Object.defineProperty(mongoose.connection, 'readyState', {
    configurable: true,
    get: () => value
  });
};

describe('database configuration', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(mongoose.connection, 'readyState', originalDescriptor);
    }
  });

  it('returns the existing connection if already connected', async () => {
    setReadyState(1);

    const connection = await connectToDatabase();

    expect(connection).toBe(mongoose.connection);
  });

  it('connects when not already connected', async () => {
    setReadyState(0);

    const connectSpy = vi.spyOn(mongoose, 'connect').mockResolvedValue(mongoose);

    await connectToDatabase();

    expect(connectSpy).toHaveBeenCalledOnce();
  });

  it('disconnects when requested', async () => {
    setReadyState(1);
    const disconnectSpy = vi.spyOn(mongoose, 'disconnect').mockResolvedValue();

    await disconnectFromDatabase();

    expect(disconnectSpy).toHaveBeenCalledOnce();
  });
});

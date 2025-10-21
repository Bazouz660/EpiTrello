import { afterEach, describe, expect, it, vi } from 'vitest';

import { logger } from '../src/utils/logger.js';

describe('logger utility', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('logs informational messages', () => {
    const spy = vi.spyOn(console, 'log');
    logger.info('hello');
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('skips debug logs in production', () => {
    const spy = vi.spyOn(console, 'debug');
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    logger.debug('hidden');

    expect(spy).not.toHaveBeenCalled();
    if (previousEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousEnv;
    }
  });
});

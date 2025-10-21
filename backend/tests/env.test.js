import { describe, expect, it } from 'vitest';

import { env } from '../src/config/env.js';

describe('environment configuration', () => {
  it('provides sane defaults for non-production environments', () => {
    expect(env.NODE_ENV).toBeDefined();
    expect(env.PORT).toBeGreaterThan(0);
    expect(env.MONGODB_URI).toMatch(/^mongodb:\/\//);
    expect(env.JWT_SECRET.length).toBeGreaterThanOrEqual(16);
  });
});

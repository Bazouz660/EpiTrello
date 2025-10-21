import { describe, expect, it } from 'vitest';

import { getSaltRounds, hashPassword, verifyPassword } from '../src/utils/crypto.js';

describe('crypto utilities', () => {
  it('hashes and verifies the password successfully', async () => {
    const password = 'Secur3P@ssw0rd!';

    const hashed = await hashPassword(password);
    expect(hashed).not.toEqual(password);
    expect(hashed).toMatch(/\$2[aby]\$/);

    const isMatch = await verifyPassword(password, hashed);
    expect(isMatch).toBe(true);
  });

  it('exposes the configured salt rounds', () => {
    const rounds = getSaltRounds();
    expect(rounds).toBeGreaterThanOrEqual(10);
  });
});

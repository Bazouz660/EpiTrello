import { beforeEach, describe, expect, it, vi } from 'vitest';

import { clearStoredAuth, loadStoredAuth, persistAuth } from './authStorage.js';

const TOKEN_KEY = 'epitrello:token';
const USER_KEY = 'epitrello:user';

describe('authStorage helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('persists and loads auth state when storage is available', () => {
    const user = { id: 'user-1', displayName: 'Pat' };

    persistAuth('token-123', user);
    const result = loadStoredAuth();

    expect(result).toEqual({ token: 'token-123', user });
  });

  it('clears stored entries', () => {
    window.localStorage.setItem(TOKEN_KEY, 'abc');
    window.localStorage.setItem(USER_KEY, JSON.stringify({ id: 'user-2' }));

    clearStoredAuth();

    expect(window.localStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(USER_KEY)).toBeNull();
  });

  it('swallows storage errors and falls back to null auth state', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storageProto = Object.getPrototypeOf(window.localStorage);
    vi.spyOn(storageProto, 'getItem').mockImplementation(() => {
      throw new Error('storage failed');
    });

    const result = loadStoredAuth();

    expect(result).toEqual({ token: null, user: null });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('ignores persist errors to avoid crashing the UI', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storageProto = Object.getPrototypeOf(window.localStorage);
    vi.spyOn(storageProto, 'setItem').mockImplementation(() => {
      throw new Error('storage failed');
    });

    expect(() => persistAuth('token-123', { id: 'user-1' })).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });
});

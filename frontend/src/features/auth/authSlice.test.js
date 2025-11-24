import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const httpClientMock = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

const mockSetAuthToken = vi.fn();

vi.mock('../../services/httpClient.js', () => ({
  httpClient: httpClientMock,
  setAuthToken: mockSetAuthToken,
}));

const mockLoadStoredAuth = vi.fn();
const mockPersistAuth = vi.fn();
const mockClearStoredAuth = vi.fn();

vi.mock('./authStorage.js', () => ({
  loadStoredAuth: mockLoadStoredAuth,
  persistAuth: mockPersistAuth,
  clearStoredAuth: mockClearStoredAuth,
}));

const resetHttpClientMocks = () => {
  httpClientMock.get.mockReset();
  httpClientMock.post.mockReset();
  httpClientMock.patch.mockReset();
  httpClientMock.delete.mockReset();
  mockSetAuthToken.mockReset();
};

const resetStorageMocks = () => {
  mockLoadStoredAuth.mockReset();
  mockPersistAuth.mockReset();
  mockClearStoredAuth.mockReset();
};

const importAuthSlice = async (storedAuth) => {
  vi.resetModules();
  resetHttpClientMocks();
  resetStorageMocks();
  mockLoadStoredAuth.mockReturnValue(storedAuth);
  return import('./authSlice.js');
};

describe('authSlice', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('logs in a user and stores credentials on success', async () => {
    const storedAuth = { token: null, user: null };
    const { authReducer, loginUser, selectAuth } = await importAuthSlice(storedAuth);

    const responsePayload = {
      token: 'token-123',
      user: { id: 'user-1', username: 'alice', email: 'alice@example.com' },
    };

    httpClientMock.post.mockResolvedValue({ data: responsePayload });

    const store = configureStore({ reducer: { auth: authReducer } });

    await store.dispatch(
      loginUser({
        email: 'alice@example.com',
        password: 'super-secret',
      }),
    );

    const state = selectAuth(store.getState());

    expect(state.token).toBe('token-123');
    expect(state.user).toEqual(responsePayload.user);
    expect(state.status).toBe('succeeded');
    expect(mockPersistAuth).toHaveBeenCalledWith('token-123', responsePayload.user);
    expect(mockSetAuthToken).toHaveBeenCalledWith('token-123');
  });

  it('captures login errors and exposes them on state', async () => {
    const storedAuth = { token: null, user: null };
    const { authReducer, loginUser, selectAuth } = await importAuthSlice(storedAuth);

    httpClientMock.post.mockRejectedValue({
      response: { data: { message: 'Invalid credentials' } },
    });

    const store = configureStore({ reducer: { auth: authReducer } });
    await store.dispatch(loginUser({ email: 'bob@example.com', password: 'wrong' }));

    const state = selectAuth(store.getState());

    expect(state.status).toBe('failed');
    expect(state.error).toBe('Invalid credentials');
    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
  });

  it('initializes the session when a stored token is present', async () => {
    const storedAuth = { token: 'persisted-token', user: null };
    const { authReducer, initializeAuth, selectAuth } = await importAuthSlice(storedAuth);

    const currentUser = { id: 'user-2', username: 'carol', email: 'carol@example.com' };
    httpClientMock.get.mockResolvedValue({ data: { user: currentUser } });

    const store = configureStore({ reducer: { auth: authReducer } });

    await store.dispatch(initializeAuth());

    const state = selectAuth(store.getState());

    expect(state.initialized).toBe(true);
    expect(state.user).toEqual(currentUser);
    expect(state.token).toBe('persisted-token');
    expect(mockPersistAuth).toHaveBeenCalledWith('persisted-token', currentUser);
    expect(mockSetAuthToken).toHaveBeenCalledWith('persisted-token');
  });

  it('clears stored credentials when initialization fails', async () => {
    const storedAuth = { token: 'expired-token', user: null };
    const { authReducer, initializeAuth, selectAuth } = await importAuthSlice(storedAuth);

    httpClientMock.get.mockRejectedValue({
      response: { status: 401, data: { message: 'Invalid token' } },
    });

    const store = configureStore({ reducer: { auth: authReducer } });

    await store.dispatch(initializeAuth());

    const state = selectAuth(store.getState());

    expect(state.initialized).toBe(true);
    expect(state.token).toBeNull();
    expect(state.user).toBeNull();
    expect(state.error).toBe('Invalid token');
    expect(mockClearStoredAuth).toHaveBeenCalledTimes(1);
    expect(mockSetAuthToken).toHaveBeenCalledWith(null);
  });

  it('logs out and resets the session state', async () => {
    const storedAuth = { token: null, user: null };
    const { authReducer, loginUser, logout, selectAuth } = await importAuthSlice(storedAuth);

    httpClientMock.post.mockResolvedValue({
      data: {
        token: 'token-abc',
        user: { id: 'user-3', username: 'dave', email: 'dave@example.com' },
      },
    });

    const store = configureStore({ reducer: { auth: authReducer } });

    await store.dispatch(loginUser({ email: 'dave@example.com', password: 'correct-horse' }));

    expect(selectAuth(store.getState()).user).not.toBeNull();

    store.dispatch(logout());

    const state = selectAuth(store.getState());

    expect(state.user).toBeNull();
    expect(state.token).toBeNull();
    expect(state.status).toBe('idle');
    expect(mockClearStoredAuth).toHaveBeenCalledTimes(1);
    expect(mockSetAuthToken).toHaveBeenCalledWith(null);
  });
});

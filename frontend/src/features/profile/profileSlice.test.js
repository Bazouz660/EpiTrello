import { configureStore } from '@reduxjs/toolkit';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

const httpClientMock = {
  get: vi.fn(),
  put: vi.fn(),
};

const persistAuthMock = vi.fn();
const setUserSpy = vi.fn((user) => ({ type: 'auth/setUser', payload: user }));

vi.mock('../../services/httpClient.js', () => ({
  httpClient: httpClientMock,
}));

vi.mock('../auth/authSlice.js', () => ({
  clearSession: { type: 'auth/clearSession' },
  setUser: (user) => setUserSpy(user),
}));

vi.mock('../auth/authStorage.js', () => ({
  persistAuth: persistAuthMock,
}));

const importProfileSlice = async () => {
  vi.resetModules();
  httpClientMock.get.mockReset();
  httpClientMock.put.mockReset();
  persistAuthMock.mockReset();
  setUserSpy.mockClear();
  return import('./profileSlice.js');
};

const defaultAuthState = { token: 'token-123', user: null };
const createStore = (profileReducer, { profile, auth } = {}) => {
  const preloadedState =
    profile || auth
      ? {
          ...(profile ? { profile } : {}),
          auth: auth ?? defaultAuthState,
        }
      : undefined;

  return configureStore({
    reducer: {
      profile: profileReducer,
      auth: (state = auth ?? defaultAuthState) => state,
    },
    preloadedState,
  });
};

describe('profileSlice', () => {
  const originalFormData = globalThis.FormData;

  beforeAll(() => {
    if (typeof globalThis.FormData === 'undefined') {
      globalThis.FormData = class {
        constructor() {
          this.entries = [];
        }
        append(key, value) {
          this.entries.push([key, value]);
        }
      };
    }
  });

  afterAll(() => {
    globalThis.FormData = originalFormData;
  });

  it('fetches the profile successfully', async () => {
    const { profileReducer, fetchProfile, selectProfile } = await importProfileSlice();
    const user = { id: 'user-1', username: 'Jane', email: 'jane@example.com' };
    httpClientMock.get.mockResolvedValue({ data: { user } });

    const store = createStore(profileReducer);

    await store.dispatch(fetchProfile());

    const state = selectProfile(store.getState());
    expect(httpClientMock.get).toHaveBeenCalledWith('/users/profile');
    expect(state.status).toBe('succeeded');
    expect(state.data).toEqual(user);
    expect(state.error).toBeNull();
  });

  it('captures readable error messages when profile fetch fails', async () => {
    const { profileReducer, fetchProfile, selectProfile } = await importProfileSlice();
    httpClientMock.get.mockRejectedValue({ response: { data: { error: 'Unauthorized' } } });

    const store = createStore(profileReducer);

    await store.dispatch(fetchProfile());

    const state = selectProfile(store.getState());
    expect(state.status).toBe('failed');
    expect(state.error).toBe('Unauthorized');
  });

  it('updates profile data, syncs auth user, and persists the session token', async () => {
    const { profileReducer, updateProfile, selectProfile, createProfileInitialState } =
      await importProfileSlice();

    const existingProfile = { id: 'user-1', username: 'Jane', email: 'old@example.com' };
    const updatedProfile = { ...existingProfile, email: 'jane@example.com', username: 'Jane D' };

    httpClientMock.put.mockResolvedValue({
      data: { user: updatedProfile, message: 'Profile updated successfully' },
    });

    const preloadedProfileState = {
      ...createProfileInitialState(),
      data: existingProfile,
    };

    const store = createStore(profileReducer, { profile: preloadedProfileState });

    await store.dispatch(
      updateProfile({ username: updatedProfile.username, email: updatedProfile.email }),
    );

    const state = selectProfile(store.getState());
    expect(httpClientMock.put).toHaveBeenCalledWith(
      '/users/profile',
      expect.any(globalThis.FormData),
    );
    expect(setUserSpy).toHaveBeenCalledWith(updatedProfile);
    expect(persistAuthMock).toHaveBeenCalledWith(defaultAuthState.token, updatedProfile);
    expect(state.updateStatus).toBe('succeeded');
    expect(state.data).toEqual(updatedProfile);
    expect(state.lastSuccessMessage).toBe('Profile updated successfully');
  });

  it('records an error when profile update fails', async () => {
    const { profileReducer, updateProfile, selectProfile } = await importProfileSlice();
    httpClientMock.put.mockRejectedValue({ response: { data: { message: 'Email already used' } } });

    const store = createStore(profileReducer);

    await store.dispatch(updateProfile({ username: 'Jane', email: 'duplicate@example.com' }));

    const state = selectProfile(store.getState());
    expect(state.updateStatus).toBe('failed');
    expect(state.updateError).toBe('Email already used');
    expect(state.lastSuccessMessage).toBeNull();
  });

  it('changes the password and keeps track of user feedback', async () => {
    const { profileReducer, changePassword, selectProfile } = await importProfileSlice();

    httpClientMock.put.mockResolvedValue({ data: { message: 'Password updated successfully' } });

    const store = createStore(profileReducer);

    await store.dispatch(
      changePassword({ currentPassword: 'OldPass1!', newPassword: 'NewPass2!' }),
    );

    const state = selectProfile(store.getState());
    expect(state.passwordStatus).toBe('succeeded');
    expect(state.passwordMessage).toBe('Password updated successfully');
  });

  it('clears feedback helpers and resets when the session is cleared', async () => {
    const {
      profileReducer,
      clearProfileFeedback,
      clearPasswordFeedback,
      resetProfileState,
      createProfileInitialState,
      selectProfile,
    } = await importProfileSlice();

    const populatedState = {
      ...createProfileInitialState(),
      lastSuccessMessage: 'Done',
      updateError: 'Oops',
      passwordMessage: 'Updated',
      passwordError: 'Invalid',
    };

    const clearedFeedbackState = profileReducer(populatedState, clearProfileFeedback());
    expect(clearedFeedbackState.lastSuccessMessage).toBeNull();
    expect(clearedFeedbackState.updateError).toBeNull();

    const clearedPasswordState = profileReducer(populatedState, clearPasswordFeedback());
    expect(clearedPasswordState.passwordMessage).toBeNull();
    expect(clearedPasswordState.passwordError).toBeNull();

    const resetState = profileReducer(populatedState, resetProfileState());
    expect(resetState).toEqual(createProfileInitialState());

    const store = createStore(profileReducer, { profile: populatedState });
    store.dispatch({ type: 'auth/clearSession' });

    const state = selectProfile(store.getState());
    expect(state).toEqual(createProfileInitialState());
  });
});

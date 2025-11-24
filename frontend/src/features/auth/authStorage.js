const TOKEN_KEY = 'epitrello:token';
const USER_KEY = 'epitrello:user';

const isStorageAvailable = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadStoredAuth = () => {
  if (!isStorageAvailable()) return { token: null, user: null };

  try {
    const token = window.localStorage.getItem(TOKEN_KEY);
    const rawUser = window.localStorage.getItem(USER_KEY);
    const user = rawUser ? JSON.parse(rawUser) : null;
    return { token, user };
  } catch (error) {
    console.warn('Failed to load stored auth state', error);
    return { token: null, user: null };
  }
};

export const persistAuth = (token, user) => {
  if (!isStorageAvailable()) return;

  try {
    if (token) {
      window.localStorage.setItem(TOKEN_KEY, token);
    }
    if (user) {
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
  } catch (error) {
    console.warn('Failed to persist auth state', error);
  }
};

export const clearStoredAuth = () => {
  if (!isStorageAvailable()) return;

  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
  } catch (error) {
    console.warn('Failed to clear auth state', error);
  }
};

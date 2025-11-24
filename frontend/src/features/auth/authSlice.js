import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { httpClient, setAuthToken } from '../../services/httpClient.js';

import { clearStoredAuth, loadStoredAuth, persistAuth } from './authStorage.js';

const storedAuth = loadStoredAuth();

if (storedAuth.token) {
  setAuthToken(storedAuth.token);
}

const extractErrorMessage = (error) => {
  const fallback = 'Something went wrong';
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  return error.message ?? fallback;
};

export const initializeAuth = createAsyncThunk(
  'auth/initialize',
  async (_, { rejectWithValue }) => {
    const { token } = loadStoredAuth();
    if (!token) {
      return { token: null, user: null };
    }

    setAuthToken(token);

    try {
      const { data } = await httpClient.get('/auth/me');
      persistAuth(token, data.user);
      return { token, user: data.user };
    } catch (error) {
      clearStoredAuth();
      setAuthToken(null);
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async ({ username, email, password }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.post('/auth/register', {
        username,
        email,
        password,
      });

      persistAuth(data.token, data.user);
      setAuthToken(data.token);
      return data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const loginUser = createAsyncThunk(
  'auth/login',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.post('/auth/login', {
        email,
        password,
      });

      persistAuth(data.token, data.user);
      setAuthToken(data.token);
      return data;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/auth/me');
      if (!data.user) throw new Error('Malformed response');
      persistAuth(loadStoredAuth().token, data.user);
      return data.user;
    } catch (error) {
      if (error.response?.status === 401) {
        clearStoredAuth();
        setAuthToken(null);
      }
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

const initialState = {
  user: storedAuth.user,
  token: storedAuth.token,
  status: 'idle',
  error: null,
  initialized: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthError: (state) => {
      state.error = null;
      if (state.status === 'failed') state.status = 'idle';
    },
    clearSession: (state) => {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      state.initialized = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(initializeAuth.pending, (state) => {
        state.error = null;
        state.initialized = false;
      })
      .addCase(initializeAuth.fulfilled, (state, action) => {
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialized = true;
        state.error = null;
      })
      .addCase(initializeAuth.rejected, (state, action) => {
        state.user = null;
        state.token = null;
        state.initialized = true;
        state.error = action.payload ?? action.error?.message ?? 'Failed to initialize session';
      })
      .addCase(registerUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialized = true;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error?.message ?? 'Registration failed';
      })
      .addCase(loginUser.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.initialized = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error?.message ?? 'Login failed';
      })
      .addCase(fetchCurrentUser.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.user = action.payload;
        state.initialized = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.status = 'failed';
        state.user = null;
        state.token = null;
        state.error = action.payload ?? action.error?.message ?? 'Failed to refresh session';
        state.initialized = true;
      });
  },
});

export const authReducer = authSlice.reducer;
export const { clearAuthError, clearSession } = authSlice.actions;

export const logout = () => (dispatch) => {
  clearStoredAuth();
  setAuthToken(null);
  dispatch(clearSession());
};

export const selectAuth = (state) => state.auth;
export const createAuthInitialState = () => ({ ...initialState });

export default authReducer;

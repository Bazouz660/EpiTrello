import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { httpClient } from '../../services/httpClient.js';
import { clearSession, setUser } from '../auth/authSlice.js';
import { persistAuth } from '../auth/authStorage.js';

const extractErrorMessage = (error) => {
  const fallback = 'Something went wrong';
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  return error.message ?? fallback;
};

const initialState = {
  data: null,
  status: 'idle',
  error: null,
  updateStatus: 'idle',
  updateError: null,
  lastSuccessMessage: null,
  passwordStatus: 'idle',
  passwordError: null,
  passwordMessage: null,
};

export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/users/profile');
      return data.user;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const updateProfile = createAsyncThunk(
  'profile/updateProfile',
  async (
    { username, email, avatarFile, removeAvatar },
    { rejectWithValue, dispatch, getState },
  ) => {
    try {
      const formData = new FormData();
      formData.append('username', username);
      formData.append('email', email);
      if (avatarFile) {
        formData.append('avatar', avatarFile);
      }
      if (removeAvatar) {
        formData.append('removeAvatar', 'true');
      }

      const { data } = await httpClient.put('/users/profile', formData);

      dispatch(setUser(data.user));
      const {
        auth: { token },
      } = getState();
      persistAuth(token, data.user);

      return { user: data.user, message: data.message ?? 'Profile updated successfully' };
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const changePassword = createAsyncThunk(
  'profile/changePassword',
  async ({ currentPassword, newPassword }, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.put('/users/password', {
        currentPassword,
        newPassword,
      });

      return data.message ?? 'Password updated successfully';
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    resetProfileState: () => initialState,
    clearProfileFeedback: (state) => {
      state.lastSuccessMessage = null;
      state.updateError = null;
    },
    clearPasswordFeedback: (state) => {
      state.passwordMessage = null;
      state.passwordError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProfile.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchProfile.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.data = action.payload;
        state.error = null;
      })
      .addCase(fetchProfile.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload ?? action.error?.message ?? 'Failed to load profile';
      })
      .addCase(updateProfile.pending, (state) => {
        state.updateStatus = 'loading';
        state.updateError = null;
        state.lastSuccessMessage = null;
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.updateStatus = 'succeeded';
        state.data = action.payload.user;
        state.lastSuccessMessage = action.payload.message;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.updateStatus = 'failed';
        state.updateError = action.payload ?? action.error?.message ?? 'Failed to update profile';
      })
      .addCase(changePassword.pending, (state) => {
        state.passwordStatus = 'loading';
        state.passwordError = null;
        state.passwordMessage = null;
      })
      .addCase(changePassword.fulfilled, (state, action) => {
        state.passwordStatus = 'succeeded';
        state.passwordMessage = action.payload;
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.passwordStatus = 'failed';
        state.passwordError =
          action.payload ?? action.error?.message ?? 'Failed to change password';
      })
      .addCase(clearSession, () => initialState);
  },
});

export const profileReducer = profileSlice.reducer;
export const { resetProfileState, clearProfileFeedback, clearPasswordFeedback } =
  profileSlice.actions;

export const selectProfile = (state) => state.profile ?? initialState;
export const createProfileInitialState = () => ({ ...initialState });

export default profileReducer;

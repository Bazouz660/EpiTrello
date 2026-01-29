import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import { httpClient } from '../../services/httpClient.js';
import { clearSession } from '../auth/authSlice.js';

const extractErrorMessage = (error) => {
  const fallback = 'Unable to complete the request';
  if (!error) return fallback;
  if (error.response?.data?.message) return error.response.data.message;
  if (error.response?.data?.error) return error.response.data.error;
  return error.message ?? fallback;
};

const buildInitialState = () => ({
  stats: null,
  statsStatus: 'idle',
  statsError: null,
  myCards: [],
  myCardsStatus: 'idle',
  myCardsError: null,
  overdueCards: [],
  overdueCardsStatus: 'idle',
  overdueCardsError: null,
  dueSoonCards: [],
  dueSoonCardsStatus: 'idle',
  dueSoonCardsError: null,
});

const initialState = buildInitialState();

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/cards/dashboard-stats');
      return data.stats;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const fetchMyCards = createAsyncThunk(
  'dashboard/fetchMyCards',
  async ({ limit = 10 } = {}, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/cards/my-cards', { params: { limit } });
      return data.cards;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const fetchOverdueCards = createAsyncThunk(
  'dashboard/fetchOverdueCards',
  async ({ limit = 5 } = {}, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/cards/my-cards', {
        params: { overdue: 'true', limit },
      });
      return data.cards;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

export const fetchDueSoonCards = createAsyncThunk(
  'dashboard/fetchDueSoonCards',
  async ({ limit = 5 } = {}, { rejectWithValue }) => {
    try {
      const { data } = await httpClient.get('/cards/my-cards', {
        params: { dueSoon: 'true', limit },
      });
      return data.cards;
    } catch (error) {
      return rejectWithValue(extractErrorMessage(error));
    }
  },
);

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardState: () => buildInitialState(),
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.statsStatus = 'loading';
        state.statsError = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.statsStatus = 'succeeded';
        state.stats = action.payload;
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.statsStatus = 'failed';
        state.statsError = action.payload ?? 'Failed to load dashboard stats';
      })
      .addCase(fetchMyCards.pending, (state) => {
        state.myCardsStatus = 'loading';
        state.myCardsError = null;
      })
      .addCase(fetchMyCards.fulfilled, (state, action) => {
        state.myCardsStatus = 'succeeded';
        state.myCards = action.payload;
      })
      .addCase(fetchMyCards.rejected, (state, action) => {
        state.myCardsStatus = 'failed';
        state.myCardsError = action.payload ?? 'Failed to load your cards';
      })
      .addCase(fetchOverdueCards.pending, (state) => {
        state.overdueCardsStatus = 'loading';
        state.overdueCardsError = null;
      })
      .addCase(fetchOverdueCards.fulfilled, (state, action) => {
        state.overdueCardsStatus = 'succeeded';
        state.overdueCards = action.payload;
      })
      .addCase(fetchOverdueCards.rejected, (state, action) => {
        state.overdueCardsStatus = 'failed';
        state.overdueCardsError = action.payload ?? 'Failed to load overdue cards';
      })
      .addCase(fetchDueSoonCards.pending, (state) => {
        state.dueSoonCardsStatus = 'loading';
        state.dueSoonCardsError = null;
      })
      .addCase(fetchDueSoonCards.fulfilled, (state, action) => {
        state.dueSoonCardsStatus = 'succeeded';
        state.dueSoonCards = action.payload;
      })
      .addCase(fetchDueSoonCards.rejected, (state, action) => {
        state.dueSoonCardsStatus = 'failed';
        state.dueSoonCardsError = action.payload ?? 'Failed to load due soon cards';
      })
      .addCase(clearSession, () => buildInitialState());
  },
});

export const dashboardReducer = dashboardSlice.reducer;
export const { clearDashboardState } = dashboardSlice.actions;
export const selectDashboard = (state) => state.dashboard;
export const createDashboardInitialState = () => buildInitialState();

export default dashboardReducer;

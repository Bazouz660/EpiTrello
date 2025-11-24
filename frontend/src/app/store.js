import { configureStore } from '@reduxjs/toolkit';

import { authReducer } from '../features/auth/authSlice.js';
import { boardsReducer } from '../features/boards/boardsSlice.js';

const isDevelopment = import.meta.env.MODE !== 'production';

export const createAppStore = (preloadedState) =>
  configureStore({
    reducer: {
      auth: authReducer,
      boards: boardsReducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
    devTools: isDevelopment,
  });

export const store = createAppStore();

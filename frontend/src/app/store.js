import { configureStore } from '@reduxjs/toolkit';

import { authReducer } from '../features/auth/authSlice.js';
import { boardsReducer } from '../features/boards/boardsSlice.js';
import { cardsReducer } from '../features/cards/cardsSlice.js';
import { dashboardReducer } from '../features/dashboard/dashboardSlice.js';
import { listsReducer } from '../features/lists/listsSlice.js';
import { notificationsReducer } from '../features/notifications/notificationsSlice.js';
import { profileReducer } from '../features/profile/profileSlice.js';
import { socketReducer } from '../features/socket/socketSlice.js';

const isDevelopment = import.meta.env.MODE !== 'production';

export const createAppStore = (preloadedState) =>
  configureStore({
    reducer: {
      auth: authReducer,
      boards: boardsReducer,
      lists: listsReducer,
      cards: cardsReducer,
      dashboard: dashboardReducer,
      notifications: notificationsReducer,
      profile: profileReducer,
      socket: socketReducer,
    },
    preloadedState,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
    devTools: isDevelopment,
  });

export const store = createAppStore();

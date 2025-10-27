import { configureStore } from '@reduxjs/toolkit';

const isDevelopment = import.meta.env.MODE !== 'production';

export const createAppStore = () =>
  configureStore({
    reducer: {},
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: false,
      }),
    devTools: isDevelopment,
  });

export const store = createAppStore();

import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        // Global thresholds - maintain existing levels
        statements: 90,
        branches: 80,
        functions: 80,
        lines: 90,
        // Per-file thresholds for new components
        'src/features/socket/socketSlice.js': {
          statements: 100,
          branches: 95,
          functions: 100,
          lines: 100,
        },
        'src/components/boards/ActiveUsersDisplay.jsx': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
        'src/components/boards/UserCursorsOverlay.jsx': {
          statements: 100,
          branches: 100,
          functions: 100,
          lines: 100,
        },
      },
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/router.jsx',
        'src/app/**',
        'src/pages/**',
        'src/hooks/**',
        'src/services/**',
      ],
    },
  },
});

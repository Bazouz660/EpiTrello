// eslint-disable-next-line n/no-unpublished-import
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 90,
        branches: 80,
        functions: 80,
        lines: 90,
      },
      exclude: [
        'src/app.js',
        'src/server.js',
        'src/models/**',
        'src/controllers/**',
        'src/routes/**',
        'src/socket/**',
      ],
    },
  },
});

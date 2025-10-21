import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./vitest.setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        statements: 80,
        branches: 70,
        functions: 80,
        lines: 80
      },
      exclude: ['src/app.js', 'src/server.js', 'src/models/**', 'src/controllers/**', 'src/routes/**']
    }
  }
});

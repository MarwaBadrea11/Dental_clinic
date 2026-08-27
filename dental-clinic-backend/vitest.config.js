import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    // Run tests serially to avoid database conflicts
    pool: 'forks',
    poolMatchGlobs: [
      ['**/*.test.js', 'forks']
    ],
    maxConcurrency: 1,
    minThreads: 1,
    maxThreads: 1
  }
});

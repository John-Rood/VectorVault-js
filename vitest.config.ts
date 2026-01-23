import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s for API calls
    hookTimeout: 30000,
    // Run tests sequentially to maintain order for stateful tests
    sequence: {
      shuffle: false,
    },
    // Reporter options
    reporters: ['verbose'],
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './src',
    include: ['**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./test-setup.ts'],
  },
});

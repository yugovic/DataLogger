/// <reference types="vitest" />
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/firestore.rules.test.ts'],
    fileParallelism: false,
  },
});

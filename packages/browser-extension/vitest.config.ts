import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom'
  },
  resolve: {
    alias: {
      './lib/adapters/index.js': fileURLToPath(new URL('./src/test/mocks/adapter-index.mock.js', import.meta.url))
    }
  }
});

import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // e2e/ holds Playwright E2E specs (run via `npm run test:e2e`), not
    // vitest unit tests — they use @playwright/test's own test()/expect(),
    // which vitest can't run.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**']
  },
  resolve: {
    alias: {
      './lib/adapters/index.js': fileURLToPath(new URL('./src/test/mocks/adapter-index.mock.js', import.meta.url))
    }
  }
});

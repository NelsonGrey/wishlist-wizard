import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // e2e/ holds Playwright E2E specs (run via `npm run test:e2e`), not
    // vitest unit tests — they use @playwright/test's own test()/expect(),
    // which vitest can't run.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['src/**/*.js'],
      exclude: [
        'src/test/**',
        'src/**/*.test.js',
        'src/dataconnect-generated/**',
        // Not part of the shipped extension -- superseded by
        // build-manifests.mjs/build-extension.sh (zero references anywhere
        // in the current build system) and a manual browser-console
        // debugging script respectively, not application logic.
        'src/package-extension.js',
        'src/test-refactored-extractor.js',
      ],
    },
  },
  resolve: {
    alias: {
      './lib/adapters/index.js': fileURLToPath(new URL('./src/test/mocks/adapter-index.mock.js', import.meta.url))
    }
  }
});

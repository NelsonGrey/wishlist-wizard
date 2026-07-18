import { defineConfig } from '@playwright/test';

// Extension E2E tests require a persistent context with --load-extension,
// which needs a real (non-headless) Chromium — see e2e/fixtures.ts. In CI
// this runs under xvfb-run (see .github/workflows/extension-build.yml) since
// there's no real display on the runner.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list']] : [['list']],
  timeout: 30_000,
  use: {
    trace: 'retain-on-failure',
  },
});

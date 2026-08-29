/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Vite 7 uses OXC/rolldown. @vitejs/plugin-react v4.x sets the deprecated
  // `esbuild.jsx` option which Vite 7 ignores. We must configure OXC directly
  // so that JSX is transformed in the SSR/test transform path vitest uses.
  oxc: {
    jsx: {
      runtime: 'automatic',
      importSource: 'react',
    },
  } as Record<string, unknown>,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client-src'),
      '@wishlist-wizard/shared': path.resolve(__dirname, '../shared/src'),
      '@shared/firebase-utils': path.resolve(__dirname, '../firebase-utils/src'),
      '@assets': path.resolve(__dirname, '../../attached_assets'),
    },
  },
  test: {
    environment: 'jsdom',
    testTimeout: 10000,
    setupFiles: ['./client-src/test/setup.ts'],
    globals: true,
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**', '**/.{idea,git,cache,output,temp}/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: ['client-src/**/*.{ts,tsx}'],
      exclude: [
        'client-src/test/**',
        'client-src/**/*.test.{ts,tsx}',
        'client-src/**/*.d.ts',
        'client-src/components/ui/**', // generated shadcn primitives, not hand-written app logic
        'client-src/main.tsx',
        // Dead code: zero import sites anywhere in the app (verified via
        // grep), each superseded by an equivalent that IS wired up --
        // use-analytics.tsx's page-view tracking duplicates
        // AppRouter.tsx's own AnalyticsRouteTracker; useFirebaseData.tsx's
        // hooks duplicate firestore.ts's useUserWishlists/useWishlistItems/
        // useUserNotifications, which are what pages actually import.
        'client-src/hooks/use-analytics.tsx',
        'client-src/hooks/useFirebaseData.tsx',
      ],
    },
  },
});

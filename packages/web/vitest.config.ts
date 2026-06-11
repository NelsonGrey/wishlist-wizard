/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client-src'),
      '@wishlist-wizard/shared': path.resolve(__dirname, '../shared/dist/index.js'),
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
  },
});

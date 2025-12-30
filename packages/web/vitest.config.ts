/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client-src'),
      '@wishlist-wizard/shared': path.resolve(__dirname, '../shared/src'),
      '@assets': path.resolve(__dirname, '../../attached_assets'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./client-src/test/setup.ts'],
    globals: true,
  },
});
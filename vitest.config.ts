import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./client/src/test/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mjs,cts,jsx,tsx}'],
    coverage: {
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './client/src'),
      '@shared': resolve(__dirname, './shared'),
      '@server': resolve(__dirname, './server'),
      '@components': resolve(__dirname, './client/src/components'),
      '@pages': resolve(__dirname, './client/src/pages'),
      '@assets': resolve(__dirname, './client/public'),
      '@hooks': resolve(__dirname, './client/src/hooks'),
      '@lib': resolve(__dirname, './client/src/lib'),
    },
  },
});
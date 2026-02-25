import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'popup-html': resolve(__dirname, 'src/popup.html'),
        'popup-bootstrap': resolve(__dirname, 'src/popup-bootstrap.js'),
        'popup': resolve(__dirname, 'src/popup.js'),
        background: resolve(__dirname, 'src/background.js'),
        content: resolve(__dirname, 'src/content.js'),
        'enhanced-product-extractor': resolve(__dirname, 'src/enhanced-product-extractor.js'),
        'popup-auth': resolve(__dirname, 'src/popup-auth.js'),
        'coupons': resolve(__dirname, 'src/coupons.js'),
        'comparison': resolve(__dirname, 'src/comparison.js'),
        'quick-add': resolve(__dirname, 'src/quick-add.js'),
        'popup-extra': resolve(__dirname, 'src/popup-extra.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
});
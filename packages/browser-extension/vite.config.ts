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
        'web-auth-bridge': resolve(__dirname, 'src/web-auth-bridge.js'),
        'enhanced-product-extractor': resolve(__dirname, 'src/enhanced-product-extractor.js'),
        'popup-auth': resolve(__dirname, 'src/popup-auth.js'),
        'coupons': resolve(__dirname, 'src/coupons.js'),
        'comparison': resolve(__dirname, 'src/comparison.js'),
        'popup-extra': resolve(__dirname, 'src/popup-extra.js')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: 'assets/[name].[ext]',
        // content.js and enhanced-product-extractor.js are injected together
        // into the SAME shared, non-module execution context by the browser
        // extension system (see manifest.json's content_scripts), unlike the
        // popup scripts which load as isolated `type="module"` scripts. Each
        // bundle's minifier renames top-level identifiers independently with
        // no knowledge of the other, so two separately-built files can easily
        // collide on the same single-letter name (observed: both declared a
        // top-level `g`, throwing "Identifier 'g' has already been declared"
        // and silently aborting whichever script loaded second — content.js).
        // Wrapping just these two entries' output in an IIFE scopes their
        // top-level declarations locally so they can never collide, without
        // switching the whole build to `format: 'iife'` (which Rollup
        // rejects here since the popup-html entry triggers code-splitting).
        banner: (chunk) => (
          ['content', 'enhanced-product-extractor'].includes(chunk.name) ? '(function () {' : ''
        ),
        footer: (chunk) => (
          ['content', 'enhanced-product-extractor'].includes(chunk.name) ? '})();' : ''
        ),
      }
    }
  }
});
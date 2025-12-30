import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client-src"),
      "@wishlist-wizard/shared": path.resolve(import.meta.dirname, "../shared/src"),
      "@shared/firebase-utils": path.resolve(import.meta.dirname, "../firebase-utils/src"),
      "@assets": path.resolve(import.meta.dirname, "../../attached_assets"),
    },
  },
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(import.meta.dirname, "index.html")
      }
    }
  },
});

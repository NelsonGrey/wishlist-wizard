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
      },
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }

          if (id.includes("firebase")) {
            return "vendor-firebase";
          }

          if (id.includes("three") || id.includes("@react-three")) {
            return "vendor-3d";
          }

          if (id.includes("@radix-ui") || id.includes("lucide-react")) {
            return "vendor-ui";
          }

          if (id.includes("recharts") || id.includes("react-big-calendar") || id.includes("date-fns")) {
            return "vendor-analytics";
          }

          if (id.includes("react") || id.includes("wouter") || id.includes("@tanstack/react-query")) {
            return "vendor-core";
          }

          return "vendor-misc";
        }
      }
    }
  },
});

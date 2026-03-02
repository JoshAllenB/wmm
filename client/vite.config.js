import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import fs from "fs";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // eslint-disable-next-line no-undef
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Add version to all generated assets
        assetFileNames: (assetInfo) => {
          const ext = path.extname(assetInfo.name);
          const name = path.basename(assetInfo.name, ext);
          return `assets/${name}-[hash]${ext}`;
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  // Inject version as base path query parameter
  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === "html") {
        try {
          const versionPath = path.resolve(__dirname, "./public/version.json");
          if (fs.existsSync(versionPath)) {
            const version = JSON.parse(fs.readFileSync(versionPath, "utf-8"));
            return `/${filename}?v=${version.version}`;
          }
        } catch (e) {
          console.warn(
            "Could not read version.json, skipping version query param",
          );
        }
      }
      return `/${filename}`;
    },
  },
});

import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import fs from "fs";

export default defineConfig(({ mode }) => {
  const isGithub = mode === "github";

  return {
    plugins: [react()],
    base: isGithub ? "/wmm/" : "/",

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    build: {
      rollupOptions: {
        output: {
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

    experimental: {
      renderBuiltUrl(filename, { hostType }) {
        if (hostType === "html") {
          try {
            const versionPath = path.resolve(
              __dirname,
              "./public/version.json",
            );
            if (fs.existsSync(versionPath)) {
              const version = JSON.parse(fs.readFileSync(versionPath, "utf-8"));
              return `${isGithub ? "/wmm" : ""}/${filename}?v=${version.version}`;
            }
          } catch (e) {
            console.warn("Could not read version.json");
          }
        }

        return `${isGithub ? "/wmm/" : "/"}${filename}`;
      },
    },
  };
});

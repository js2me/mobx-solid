import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [solidPlugin()],
  resolve: {
    alias: {
      "mobx-solid": resolve(root, "../../src/index.ts"),
    },
  },
  server: {
    port: 5174,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

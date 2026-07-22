import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin({ ssr: true })],
  test: {
    environment: "node",
    globals: true,
    include: ["test/ssr.test.tsx"],
  },
});

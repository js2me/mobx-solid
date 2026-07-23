import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin({ ssr: true })],
  test: {
    name: "ssr",
    environment: "node",
    globals: true,
    include: ["tests/basic/ssr.test.tsx"],
  },
});

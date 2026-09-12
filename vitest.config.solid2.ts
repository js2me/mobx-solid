import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    conditions: ["browser", "development"],
  },
  test: {
    name: "solid-2",
    environment: "jsdom",
    globals: true,
    include: ["tests/solid-2/**/*.test.ts"],
  },
});

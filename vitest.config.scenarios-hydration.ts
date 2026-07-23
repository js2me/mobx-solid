import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

/**
 * Hydratable client build + jsdom.
 * Markup is seeded manually (browser builds cannot call renderToString).
 */
export default defineConfig({
  plugins: [solidPlugin({ solid: { hydratable: true } })],
  test: {
    name: "scenarios-hydration",
    environment: "jsdom",
    globals: true,
    include: ["tests/scenarios/real-hydration.test.tsx"],
  },
});

import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    name: "unit",
    environment: "jsdom",
    globals: true,
    include: ["tests/**/*.test.{ts,tsx}"],
    exclude: [
      "tests/basic/ssr.test.tsx",
      "tests/scenarios/obs-without-global-tracking.test.tsx",
      "tests/scenarios/real-hydration.test.tsx",
    ],
  },
});

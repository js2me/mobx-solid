import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "test/enable-observable-tracking.test.ts",
      "test/from-observable.test.ts",
      "test/integration.test.tsx",
      "test/integration-from-observable.test.tsx",
      "test/hydration.test.tsx",
      "test/mvvm-scenario.test.tsx",
      "test/memory-leak.test.ts",
      "test/memory-leak-components.test.tsx",
    ],
  },
});

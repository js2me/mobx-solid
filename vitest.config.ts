import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    environment: "jsdom",
    globals: true,
    include: [
      "test/static-rendering.test.ts",
      "test/enable-observable-tracking.test.ts",
      "test/observer.test.ts",
      "test/observer-component.test.ts",
      "test/from-observable.test.ts",
      "test/create-local-observable.test.ts",
      "test/integration.test.tsx",
      "test/integration-observer-from-observable.test.tsx",
      "test/hydration.test.tsx",
      "test/mvvm-scenario.test.tsx",
      "test/memory-leak.test.ts",
      "test/memory-leak-components.test.tsx",
    ],
  },
});

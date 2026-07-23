import { defineConfig } from "vitest/config";
import solidPlugin from "vite-plugin-solid";

/** Isolated: must not call enableObservableTracking in this process. */
export default defineConfig({
  plugins: [solidPlugin()],
  test: {
    name: "scenarios-obs-only",
    environment: "jsdom",
    globals: true,
    include: ["tests/scenarios/obs-without-global-tracking.test.tsx"],
  },
});

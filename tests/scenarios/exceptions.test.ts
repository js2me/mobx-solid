import { describe, it, expect, vi, beforeEach } from "vitest";
import { observable, action } from "mobx";
import { createRoot, createEffect, createMemo, createSignal } from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";

describe("scenario: exceptions in reactive computations", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  describe("obs() getter exceptions", () => {
    it("obs() getter that throws on initial run — autorun still created, signal stays undefined", () => {
      const store = observable({ count: 0 });

      let accessor!: () => number;

      // Suppress MobX console warning about uncaught exception
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      createRoot((d) => {
        accessor = obs(() => {
          throw new Error("initial fail");
        });
        return d;
      });

      // Signal initialized as undefined (the `undefined as unknown as T` in obs.ts)
      // because setValue(getter) never completed — Solid's setter caught the throw
      expect(accessor()).toBe(undefined);

      warnSpy.mockRestore();
    });

    it("obs() getter that throws on re-run — signal retains previous value", () => {
      const store = observable({ count: 0 });

      let accessor!: () => number;

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      createRoot((d) => {
        accessor = obs(() => {
          if (store.count > 5) throw new Error("too big");
          return store.count;
        });
        return d;
      });

      // Initial run succeeds
      expect(accessor()).toBe(0);

      // Small change — succeeds
      action(() => { store.count = 3; })();
      expect(accessor()).toBe(3);

      // Change that triggers exception — MobX logs warning, signal keeps old value
      action(() => { store.count = 10; })();
      expect(accessor()).toBe(3);

      // Subsequent change that doesn't throw — autorun recovers
      action(() => { store.count = 4; })();
      expect(accessor()).toBe(4);

      warnSpy.mockRestore();
    });

    it("obs() getter recovers after exception — subsequent updates propagate", () => {
      const store = observable({ count: 0 });

      let accessor!: () => number;
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      createRoot((d) => {
        accessor = obs(() => {
          if (store.count === 1) throw new Error("boom");
          return store.count;
        });
        return d;
      });

      expect(accessor()).toBe(0);

      // Exception
      action(() => { store.count = 1; })();
      expect(accessor()).toBe(0); // stale

      // Recovery
      action(() => { store.count = 2; })();
      expect(accessor()).toBe(2);

      // Another normal update
      action(() => { store.count = 5; })();
      expect(accessor()).toBe(5);

      warnSpy.mockRestore();
    });

    it("obs() autorun is NOT disposed after getter exception — can still recover", () => {
      const store = observable({ count: 0 });
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      const dispose = createRoot((d) => {
        obs(() => {
          if (store.count > 5) throw new Error("fail");
          return store.count;
        });
        return d;
      });

      // Exception
      action(() => { store.count = 10; })();
      // Recovery — proves autorun was NOT disposed by the exception
      action(() => { store.count = 3; })();
      // After recovery, disposing the root properly cleans up
      dispose();

      // No zombie after dispose
      action(() => { store.count = 20; })();
      // (Would be zombie if dispose didn't work)

      warnSpy.mockRestore();
    });
  });

  describe("enableObservableTracking — exceptions in tracked computations", () => {
    it("createEffect that throws on re-run — effect stays alive and recovers", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      createRoot((d) => {
        createEffect(() => {
          if (store.count > 5) throw new Error("too big");
          values.push(store.count);
        });
        return d;
      });

      expect(values).toEqual([0]);

      action(() => { store.count = 3; })();
      expect(values).toEqual([0, 3]);

      // Exception — effect doesn't push, MobX logs warning
      action(() => { store.count = 10; })();
      expect(values).toEqual([0, 3]);

      // Recovery — effect re-runs successfully
      action(() => { store.count = 4; })();
      expect(values).toEqual([0, 3, 4]);

      warnSpy.mockRestore();
    });

    it("createMemo that throws on re-run — returns undefined during exception, then recovers", () => {
      const store = observable({ count: 0 });

      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

      let memo!: () => number;
      createRoot((d) => {
        memo = createMemo(() => {
          if (store.count > 5) throw new Error("too big");
          return store.count;
        });
        return d;
      });

      expect(memo()).toBe(0);

      action(() => { store.count = 3; })();
      expect(memo()).toBe(3);

      // Exception — Solid's memo returns undefined when computation throws
      action(() => { store.count = 10; })();
      expect(memo()).toBe(undefined);

      // Recovery — memo re-evaluates successfully
      action(() => { store.count = 4; })();
      expect(memo()).toBe(4);

      warnSpy.mockRestore();
    });
  });
});

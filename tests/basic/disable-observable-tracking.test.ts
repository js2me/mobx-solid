import { describe, it, expect, beforeEach } from "vitest";
import { observable, action } from "mobx";
import { createRoot, createSignal, createEffect, createMemo } from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { disableObservableTracking } from "../../src/disable-observable-tracking";
import { observerCount } from "./helpers";

describe("disableObservableTracking", () => {
  it("is a no-op when tracking was never enabled", () => {
    // Must stay the first test in this file — every test below enables the bridge.
    expect(() => disableObservableTracking()).not.toThrow();
  });

  describe("when tracking is enabled", () => {
    beforeEach(() => {
      enableObservableTracking();
    });

    it("stops Solid computations from reacting to MobX changes", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      createRoot(() => {
        createEffect(() => {
          values.push(store.count);
        });
      });

      expect(values).toEqual([0]);

      disableObservableTracking();

      action(() => { store.count = 1; })();
      expect(values).toEqual([0]);

      action(() => { store.count = 5; })();
      expect(values).toEqual([0]);
    });

    it("disposes live MobX reactions — observables lose their observers", () => {
      const store = observable({ count: 0 });

      const dispose = createRoot((d) => {
        createEffect(() => {
          void store.count;
        });
        return d;
      });

      expect(observerCount(store, "count")).toBeGreaterThan(0);

      disableObservableTracking();

      expect(observerCount(store, "count")).toBe(0);

      dispose();
    });

    it("disposes reactions across multiple roots", () => {
      const store = observable({ count: 0 });

      const disposeA = createRoot((d) => {
        createEffect(() => { void store.count; });
        return d;
      });
      const disposeB = createRoot((d) => {
        createMemo(() => store.count * 2)();
        return d;
      });

      expect(observerCount(store, "count")).toBe(2);

      disableObservableTracking();

      expect(observerCount(store, "count")).toBe(0);

      disposeA();
      disposeB();
    });

    it("is idempotent — disabling twice is safe", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      createRoot(() => {
        createEffect(() => {
          values.push(store.count);
        });
      });

      disableObservableTracking();
      expect(() => disableObservableTracking()).not.toThrow();

      action(() => { store.count = 1; })();
      expect(values).toEqual([0]);
    });

    it("computations re-run for Solid-side reasons still read fresh MobX values", () => {
      const store = observable({ count: 0 });
      const [poke, setPoke] = createSignal(0);
      const values: number[] = [];

      createRoot(() => {
        createEffect(() => {
          poke();
          values.push(store.count);
        });
      });

      expect(values).toEqual([0]);

      disableObservableTracking();

      action(() => { store.count = 42; })();
      // No MobX-driven update while disabled.
      expect(values).toEqual([0]);

      // A Solid-side invalidation re-runs the computation and reads the
      // current MobX value without subscribing to it.
      setPoke(1);
      expect(values).toEqual([0, 42]);

      action(() => { store.count = 43; })();
      expect(values).toEqual([0, 42]);
    });

    it("new computations created while disabled do not track MobX", () => {
      const store = observable({ count: 0 });

      disableObservableTracking();

      const values: number[] = [];
      createRoot(() => {
        createEffect(() => {
          values.push(store.count);
        });
      });

      expect(values).toEqual([0]);
      expect(observerCount(store, "count")).toBe(0);

      action(() => { store.count = 9; })();
      expect(values).toEqual([0]);
    });

    it("enableObservableTracking restores tracking for new computations", () => {
      const store = observable({ count: 0 });

      disableObservableTracking();
      enableObservableTracking();

      const values: number[] = [];
      createRoot(() => {
        createEffect(() => {
          values.push(store.count);
        });
      });

      expect(values).toEqual([0]);

      action(() => { store.count = 7; })();
      expect(values).toEqual([0, 7]);
    });

    it("existing computations resume tracking on their next re-run after re-enable", () => {
      const store = observable({ count: 0 });
      const [poke, setPoke] = createSignal(0);
      let runs = 0;
      const values: number[] = [];

      createRoot(() => {
        createEffect(() => {
          poke();
          runs++;
          values.push(store.count);
        });
      });

      expect(values).toEqual([0]);
      expect(observerCount(store, "count")).toBe(1);

      disableObservableTracking();
      expect(observerCount(store, "count")).toBe(0);

      enableObservableTracking();

      // Still deaf — it has not re-run yet.
      action(() => { store.count = 1; })();
      expect(values).toEqual([0]);

      // A Solid-side poke re-runs it; it re-subscribes through the bridge.
      setPoke(1);
      expect(values).toEqual([0, 1]);
      expect(observerCount(store, "count")).toBe(1);

      // MobX drives it again, exactly once per change.
      const runsBefore = runs;
      action(() => { store.count = 2; })();
      expect(values).toEqual([0, 1, 2]);
      expect(runs).toBe(runsBefore + 1);
    });

    it("supports repeated enable/disable ping-pong", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      createRoot(() => {
        createEffect(() => {
          values.push(store.count);
        });
      });

      disableObservableTracking();
      enableObservableTracking();
      disableObservableTracking();

      action(() => { store.count = 3; })();
      expect(values).toEqual([0]);

      enableObservableTracking();
      const fresh: number[] = [];
      createRoot(() => {
        createEffect(() => {
          fresh.push(store.count);
        });
      });

      action(() => { store.count = 4; })();
      expect(fresh).toEqual([3, 4]);
    });
  });
});

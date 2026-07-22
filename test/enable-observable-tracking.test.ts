import { describe, it, expect, beforeEach } from "vitest";
import { observable, action, computed } from "mobx";
import { createRoot, createSignal, createEffect, createMemo, onCleanup } from "solid-js";
import { enableObservableTracking, isObservableTrackingEnabled } from "../src/enable-observable-tracking";

// Reset binding state between tests — we need a fresh module state.
// Since enableExternalSource is global, we can only call enableObservableTracking once per process.
// We call it once here and test behavior.
let bindingInitialized = false;

function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("enableObservableTracking", () => {
  beforeEach(() => {
    ensureBinding();
  });

  it("is idempotent — calling multiple times is safe", () => {
    enableObservableTracking();
    enableObservableTracking();
    expect(isObservableTrackingEnabled()).toBe(true);
  });

  describe("createEffect integration", () => {
    it("tracks MobX observable changes inside createEffect", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      createRoot((dispose) => {
        createEffect(() => {
          values.push(store.count);
        });
      });

      expect(values).toEqual([0]);

      action(() => { store.count = 1; })();
      expect(values).toEqual([0, 1]);

      action(() => { store.count = 5; })();
      expect(values).toEqual([0, 1, 5]);
    });

    it("tracks multiple MobX observables in a single effect", () => {
      const store = observable({ x: 1, y: 2 });
      const sums: number[] = [];

      createRoot((dispose) => {
        createEffect(() => {
          sums.push(store.x + store.y);
        });
      });

      expect(sums).toEqual([3]);

      action(() => { store.x = 10; })();
      expect(sums).toEqual([3, 12]);

      action(() => { store.y = 20; })();
      expect(sums).toEqual([3, 12, 30]);
    });
  });

  describe("createMemo integration", () => {
    it("tracks MobX observable changes inside createMemo", () => {
      const store = observable({ count: 0 });
      let memo: () => number;

      createRoot((dispose) => {
        memo = createMemo(() => store.count * 2);
      });

      expect(memo!()).toBe(0);

      action(() => { store.count = 3; })();
      expect(memo!()).toBe(6);

      action(() => { store.count = 10; })();
      expect(memo!()).toBe(20);
    });

    it("createMemo re-evaluates when MobX observable changes", () => {
      const store = observable({ count: 0 });
      let evalCount = 0;

      let memo: () => number;
      createRoot((dispose) => {
        memo = createMemo(() => {
          evalCount++;
          return store.count * 2;
        });
      });

      // First read triggers evaluation
      expect(memo!()).toBe(0);
      const evalsAfterFirstRead = evalCount;
      expect(evalsAfterFirstRead).toBeGreaterThanOrEqual(1);

      // Change observable
      action(() => { store.count = 5; })();

      // Memo should reflect the new value
      expect(memo!()).toBe(10);
      expect(evalCount).toBeGreaterThan(evalsAfterFirstRead);
    });
  });

  describe("MobX computed integration", () => {
    it("MobX computed values are tracked in SolidJS computations", () => {
      const store = observable({
        count: 0,
        get double() {
          return this.count * 2;
        },
      });

      let memo: () => number;
      createRoot((dispose) => {
        memo = createMemo(() => store.double);
      });

      expect(memo!()).toBe(0);

      action(() => { store.count = 7; })();
      expect(memo!()).toBe(14);
    });
  });

  describe("MobX action batching", () => {
    it("multiple changes in a single action trigger one update", () => {
      const store = observable({ x: 0, y: 0 });
      const values: string[] = [];

      createRoot((dispose) => {
        createEffect(() => {
          values.push(`${store.x},${store.y}`);
        });
      });

      expect(values).toEqual(["0,0"]);

      action(() => {
        store.x = 1;
        store.y = 2;
      })();

      // After batching, only one additional update should have occurred
      expect(values).toEqual(["0,0", "1,2"]);
    });
  });

  describe("disposal", () => {
    it("MobX reactions are disposed when SolidJS root is disposed", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      const dispose = createRoot((dispose) => {
        createEffect(() => {
          values.push(store.count);
        });
        return dispose;
      });

      expect(values).toEqual([0]);

      action(() => { store.count = 1; })();
      expect(values).toEqual([0, 1]);

      // Dispose the SolidJS root — should clean up the MobX reaction
      dispose();

      action(() => { store.count = 2; })();
      // No new values — reaction was disposed
      expect(values).toEqual([0, 1]);
    });
  });
});

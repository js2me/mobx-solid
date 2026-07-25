import { describe, it, expect, beforeEach } from "vitest";
import {
  observable,
  action,
  onBecomeObserved,
  onBecomeUnobserved,
} from "mobx";
import {
  createRoot,
  createEffect,
  createMemo,
  createRenderEffect,
  createComputed,
  createSignal,
} from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount, observerNames } from "./helpers";

describe("memory / reaction disposal", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  describe("createMemo", () => {
    it("registers exactly one MobX observer while alive", () => {
      const store = observable({ count: 0 });

      const dispose = createRoot((d) => {
        const memo = createMemo(() => store.count);
        expect(memo()).toBe(0);
        expect(observerCount(store, "count")).toBe(1);
        expect(observerNames(store, "count")).toEqual(["mobx-solid"]);
        return d;
      });

      dispose();
      expect(observerCount(store, "count")).toBe(0);
    });

    it("fires onBecomeUnobserved when Solid root is disposed", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const dispose = createRoot((d) => {
        const memo = createMemo(() => store.count);
        memo();
        return d;
      });

      expect(observed).toBe(1);
      expect(unobserved).toBe(0);

      dispose();

      expect(observed).toBe(1);
      expect(unobserved).toBe(1);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("does not accumulate observers across re-evaluations", () => {
      const store = observable({ count: 0 });

      createRoot(() => {
        const memo = createMemo(() => store.count);
        memo();

        for (let i = 1; i <= 50; i++) {
          action(() => {
            store.count = i;
          })();
          expect(memo()).toBe(i);
          expect(observerCount(store, "count")).toBe(1);
        }
      });
    });

    it("stops reacting after dispose (no zombie updates)", () => {
      const store = observable({ count: 0 });
      let evals = 0;

      const dispose = createRoot((d) => {
        const memo = createMemo(() => {
          evals++;
          return store.count;
        });
        memo();
        return d;
      });

      expect(evals).toBe(1);

      action(() => {
        store.count = 1;
      })();
      expect(evals).toBe(2);

      dispose();
      const evalsAfterDispose = evals;

      action(() => {
        store.count = 2;
      })();
      expect(evals).toBe(evalsAfterDispose);
      expect(observerCount(store, "count")).toBe(0);
    });
  });

  describe("createEffect", () => {
    it("disposes MobX reaction when Solid root is disposed", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const dispose = createRoot((d) => {
        createEffect(() => {
          values.push(store.count);
        });
        return d;
      });

      expect(values).toEqual([0]);
      expect(observed).toBe(1);
      expect(observerCount(store, "count")).toBe(1);

      action(() => {
        store.count = 1;
      })();
      expect(values).toEqual([0, 1]);

      dispose();

      expect(unobserved).toBe(1);
      expect(observerCount(store, "count")).toBe(0);

      action(() => {
        store.count = 2;
      })();
      expect(values).toEqual([0, 1]);
    });
  });

  describe("createRenderEffect", () => {
    it("disposes MobX reaction when Solid root is disposed", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const dispose = createRoot((d) => {
        createRenderEffect(() => {
          values.push(store.count);
        });
        return d;
      });

      // createRenderEffect runs synchronously — value available immediately
      expect(values).toEqual([0]);
      expect(observed).toBe(1);
      expect(observerCount(store, "count")).toBe(1);

      action(() => {
        store.count = 1;
      })();
      expect(values).toEqual([0, 1]);

      dispose();

      expect(unobserved).toBe(1);
      expect(observerCount(store, "count")).toBe(0);

      action(() => {
        store.count = 2;
      })();
      expect(values).toEqual([0, 1]);
    });

    it("does not accumulate observers across re-evaluations", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      createRoot(() => {
        createRenderEffect(() => {
          values.push(store.count);
        });

        for (let i = 1; i <= 50; i++) {
          action(() => {
            store.count = i;
          })();
          expect(observerCount(store, "count")).toBe(1);
        }
      });
    });

    it("stops reacting after dispose (no zombie updates)", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      const dispose = createRoot((d) => {
        createRenderEffect(() => {
          values.push(store.count);
        });
        return d;
      });

      expect(values).toEqual([0]);

      action(() => {
        store.count = 1;
      })();
      expect(values).toEqual([0, 1]);

      dispose();

      action(() => {
        store.count = 2;
      })();
      expect(values).toEqual([0, 1]);
      expect(observerCount(store, "count")).toBe(0);
    });
  });

  describe("createComputed", () => {
    it("registers exactly one MobX observer while alive and releases on dispose", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const dispose = createRoot((d) => {
        createComputed(() => {
          void store.count;
        });
        return d;
      });

      expect(observed).toBe(1);
      expect(observerCount(store, "count")).toBe(1);

      dispose();

      expect(unobserved).toBe(1);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("does not accumulate observers across re-evaluations", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      createRoot(() => {
        createComputed(() => {
          values.push(store.count);
        });

        for (let i = 1; i <= 50; i++) {
          action(() => {
            store.count = i;
          })();
          expect(observerCount(store, "count")).toBe(1);
        }
      });
    });

    it("stops reacting after dispose (no zombie updates)", () => {
      const store = observable({ count: 0 });
      const values: number[] = [];

      const dispose = createRoot((d) => {
        createComputed(() => {
          values.push(store.count);
        });
        return d;
      });

      expect(values).toEqual([0]);

      action(() => {
        store.count = 1;
      })();
      const valuesAfterUpdate = values.length;

      dispose();

      action(() => {
        store.count = 2;
      })();
      expect(values.length).toBe(valuesAfterUpdate);
      expect(observerCount(store, "count")).toBe(0);
    });
  });

  describe("nested / multiple computations", () => {
    it("disposes all reactions from nested memos and effects", () => {
      const store = observable({ a: 0, b: 0, c: 0 });
      let unobservedA = 0;
      let unobservedB = 0;
      let unobservedC = 0;
      onBecomeUnobserved(store, "a", () => {
        unobservedA++;
      });
      onBecomeUnobserved(store, "b", () => {
        unobservedB++;
      });
      onBecomeUnobserved(store, "c", () => {
        unobservedC++;
      });

      const dispose = createRoot((d) => {
        createMemo(() => store.a)();
        createMemo(() => store.b)();
        createEffect(() => {
          void store.c;
        });
        return d;
      });

      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(1);
      expect(observerCount(store, "c")).toBe(1);

      dispose();

      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
      expect(observerCount(store, "c")).toBe(0);
      expect(unobservedA).toBe(1);
      expect(unobservedB).toBe(1);
      expect(unobservedC).toBe(1);
    });

    it("disposing one root does not affect another", () => {
      const store = observable({ count: 0 });
      const valuesA: number[] = [];
      const valuesB: number[] = [];

      const disposeA = createRoot((d) => {
        createEffect(() => {
          valuesA.push(store.count);
        });
        return d;
      });

      const disposeB = createRoot((d) => {
        createEffect(() => {
          valuesB.push(store.count);
        });
        return d;
      });

      expect(observerCount(store, "count")).toBe(2);

      disposeA();
      expect(observerCount(store, "count")).toBe(1);

      action(() => {
        store.count = 1;
      })();
      expect(valuesA).toEqual([0]);
      expect(valuesB).toEqual([0, 1]);

      disposeB();
      expect(observerCount(store, "count")).toBe(0);
    });
  });

  describe("conditional computations", () => {
    it("releases MobX observers when nested owned computations are cleaned up", () => {
      const store = observable({ count: 0 });
      let setVisible!: (v: boolean | ((p: boolean) => boolean)) => void;
      let unobserved = 0;
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      createRoot(() => {
        const [visible, set] = createSignal(true);
        setVisible = set;
        createEffect(() => {
          if (!visible()) return;
          createMemo(() => store.count)();
        });
      });

      expect(observerCount(store, "count")).toBe(1);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(1);

      setVisible(true);
      expect(observerCount(store, "count")).toBe(1);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(2);
    });
  });

  describe("stress — create / dispose cycles", () => {
    it("does not leak observers after many root create/dispose cycles", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const CYCLES = 200;

      for (let i = 0; i < CYCLES; i++) {
        const dispose = createRoot((d) => {
          const memo = createMemo(() => store.count);
          memo();
          createEffect(() => {
            void store.count;
          });
          return d;
        });

        expect(observerCount(store, "count")).toBe(2);
        dispose();
        expect(observerCount(store, "count")).toBe(0);
      }

      expect(observed).toBe(CYCLES);
      expect(unobserved).toBe(CYCLES);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("does not leak when many roots are disposed in reverse order", () => {
      const store = observable({ count: 0 });
      const disposers: Array<() => void> = [];

      for (let i = 0; i < 50; i++) {
        disposers.push(
          createRoot((d) => {
            createMemo(() => store.count)();
            return d;
          }),
        );
      }

      expect(observerCount(store, "count")).toBe(50);

      for (let i = disposers.length - 1; i >= 0; i--) {
        disposers[i]();
        expect(observerCount(store, "count")).toBe(i);
      }

      expect(observerCount(store, "count")).toBe(0);
    });
  });

  describe("dependency switching", () => {
    it("createEffect releases old observer when switching to a different field", () => {
      const store = observable({ a: "alpha", b: "beta" });
      let setFlag!: (v: boolean) => void;
      let unobservedA = 0;
      let unobservedB = 0;

      onBecomeUnobserved(store, "a", () => { unobservedA++; });
      onBecomeUnobserved(store, "b", () => { unobservedB++; });

      createRoot(() => {
        const [flag, set] = createSignal(true);
        setFlag = set;
        createEffect(() => {
          if (flag()) {
            void store.a;
          } else {
            void store.b;
          }
        });
      });

      // Initially observing store.a
      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(0);

      // Switch to store.b
      setFlag(false);
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(1);
      expect(unobservedA).toBe(1);

      // Switch back to store.a
      setFlag(true);
      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(0);
      expect(unobservedB).toBe(1);

      // Switch again to store.b
      setFlag(false);
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(1);
      expect(unobservedA).toBe(2);
    });

    it("createMemo releases old observer when switching to a different field", () => {
      const store = observable({ a: 1, b: 2 });
      let setFlag!: (v: boolean) => void;
      let unobservedA = 0;
      let unobservedB = 0;

      onBecomeUnobserved(store, "a", () => { unobservedA++; });
      onBecomeUnobserved(store, "b", () => { unobservedB++; });

      let memo!: () => number;

      createRoot(() => {
        const [flag, set] = createSignal(true);
        setFlag = set;
        memo = createMemo(() => flag() ? store.a : store.b);
        memo(); // initial read
      });

      // Initially observing store.a
      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(0);

      // Switch to store.b
      setFlag(false);
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(1);
      expect(unobservedA).toBe(1);
      expect(memo()).toBe(2);

      // Switch back to store.a
      setFlag(true);
      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(0);
      expect(unobservedB).toBe(1);
      expect(memo()).toBe(1);
    });

    it("obs() releases old observer when getter switches branches via MobX condition", () => {
      const store = observable({ a: 10, b: 20, flag: true });
      let unobservedA = 0;
      let unobservedB = 0;

      onBecomeUnobserved(store, "a", () => { unobservedA++; });
      onBecomeUnobserved(store, "b", () => { unobservedB++; });

      let accessor!: () => number;

      const dispose = createRoot((d) => {
        // obs() autorun tracks all MobX reads inside the getter,
        // including the condition itself (store.flag).
        accessor = obs(() => store.flag ? store.a : store.b);
        return d;
      });

      // Initially: flag=true → observing store.a and store.flag
      expect(accessor()).toBe(10);
      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "flag")).toBe(1);
      expect(observerCount(store, "b")).toBe(0);

      // Switch branch: flag=false → now observing store.b and store.flag
      action(() => { store.flag = false; })();
      expect(accessor()).toBe(20);
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(1);
      expect(observerCount(store, "flag")).toBe(1);
      expect(unobservedA).toBe(1);

      // Switch back: flag=true → observing store.a and store.flag again
      action(() => { store.flag = true; })();
      expect(accessor()).toBe(10);
      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(0);
      expect(unobservedB).toBe(1);

      dispose();
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
      expect(observerCount(store, "flag")).toBe(0);
    });

    it("switching between 3 fields via MobX condition releases all old observers", () => {
      const store = observable({ a: 1, b: 2, c: 3, mode: 0 });
      let unobservedA = 0;
      let unobservedB = 0;
      let unobservedC = 0;

      onBecomeUnobserved(store, "a", () => { unobservedA++; });
      onBecomeUnobserved(store, "b", () => { unobservedB++; });
      onBecomeUnobserved(store, "c", () => { unobservedC++; });

      let accessor!: () => number;

      const dispose = createRoot((d) => {
        accessor = obs(() => {
          if (store.mode === 0) return store.a;
          if (store.mode === 1) return store.b;
          return store.c;
        });
        return d;
      });

      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "mode")).toBe(1);
      expect(observerCount(store, "b")).toBe(0);
      expect(observerCount(store, "c")).toBe(0);

      action(() => { store.mode = 1; })();
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(1);
      expect(observerCount(store, "c")).toBe(0);
      expect(observerCount(store, "mode")).toBe(1);
      expect(unobservedA).toBe(1);

      action(() => { store.mode = 2; })();
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
      expect(observerCount(store, "c")).toBe(1);
      expect(observerCount(store, "mode")).toBe(1);
      expect(unobservedB).toBe(1);

      action(() => { store.mode = 0; })();
      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(0);
      expect(observerCount(store, "c")).toBe(0);
      expect(observerCount(store, "mode")).toBe(1);
      expect(unobservedC).toBe(1);

      dispose();
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "mode")).toBe(0);
    });

    it("obs() switching from one dep to two deps via MobX condition", () => {
      const store = observable({ x: 1, y: 2, z: 3, flag: false });
      let unobservedX = 0;
      let unobservedY = 0;
      let unobservedZ = 0;

      onBecomeUnobserved(store, "x", () => { unobservedX++; });
      onBecomeUnobserved(store, "y", () => { unobservedY++; });
      onBecomeUnobserved(store, "z", () => { unobservedZ++; });

      let accessor!: () => number;

      const dispose = createRoot((d) => {
        accessor = obs(() => store.flag ? store.x + store.y : store.z);
        return d;
      });

      // Initially: flag=false → observing store.z and store.flag
      expect(observerCount(store, "x")).toBe(0);
      expect(observerCount(store, "y")).toBe(0);
      expect(observerCount(store, "z")).toBe(1);
      expect(observerCount(store, "flag")).toBe(1);

      // Switch: flag=true → observing store.x, store.y, and store.flag
      action(() => { store.flag = true; })();
      expect(observerCount(store, "x")).toBe(1);
      expect(observerCount(store, "y")).toBe(1);
      expect(observerCount(store, "z")).toBe(0);
      expect(observerCount(store, "flag")).toBe(1);
      expect(unobservedZ).toBe(1);

      dispose();
      expect(observerCount(store, "x")).toBe(0);
      expect(observerCount(store, "y")).toBe(0);
      expect(observerCount(store, "z")).toBe(0);
      expect(observerCount(store, "flag")).toBe(0);
    });
  });

  describe("double bridge — obs + enableObservableTracking on same property", () => {
    it("createMemo + obs on same property create 2 observers, both released on dispose", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const dispose = createRoot((d) => {
        // enableObservableTracking bridge via createMemo
        createMemo(() => store.count)();
        // obs() bridge via autorun
        obs(() => store.count);
        return d;
      });

      // 2 observers on the same property: 1 from createMemo (Reaction) + 1 from obs (autorun)
      expect(observerCount(store, "count")).toBe(2);
      // onBecomeObserved fires once (0→≥1 transition), not per-observer
      expect(observed).toBe(1);

      dispose();

      expect(observerCount(store, "count")).toBe(0);
      // onBecomeUnobserved fires once (≥1→0 transition), not per-observer
      expect(unobserved).toBe(1);
    });

    it("createEffect + obs on same property create 2 observers, both released on dispose", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const values: number[] = [];
      let accessor!: () => number;

      const dispose = createRoot((d) => {
        createEffect(() => { values.push(store.count); });
        accessor = obs(() => store.count);
        return d;
      });

      expect(observerCount(store, "count")).toBe(2);
      // onBecomeObserved fires once (0→≥1 transition), not per-observer
      expect(observed).toBe(1);
      expect(accessor()).toBe(0);
      expect(values).toEqual([0]);

      action(() => { store.count = 1; })();
      expect(observerCount(store, "count")).toBe(2);
      expect(accessor()).toBe(1);
      expect(values).toEqual([0, 1]);

      dispose();

      expect(observerCount(store, "count")).toBe(0);
      // onBecomeUnobserved fires once (≥1→0 transition), not per-observer
      expect(unobserved).toBe(1);

      // No zombie updates from either bridge
      action(() => { store.count = 2; })();
      expect(accessor()).toBe(1); // stale — autorun disposed
      expect(values).toEqual([0, 1]); // stale — effect disposed
    });

    it("createRenderEffect + obs on same property create 2 observers, both released on dispose", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const dispose = createRoot((d) => {
        createRenderEffect(() => { void store.count; });
        obs(() => store.count);
        return d;
      });

      expect(observerCount(store, "count")).toBe(2);
      expect(observed).toBe(1);

      dispose();

      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(1);
    });

    it("createComputed + obs on same property create 2 observers, both released on dispose", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const dispose = createRoot((d) => {
        createComputed(() => { void store.count; });
        obs(() => store.count);
        return d;
      });

      expect(observerCount(store, "count")).toBe(2);
      expect(observed).toBe(1);

      dispose();

      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(1);
    });

    it("double bridge on multiple properties all clean up", () => {
      const store = observable({ a: 1, b: 2 });
      let unobservedA = 0;
      let unobservedB = 0;
      onBecomeUnobserved(store, "a", () => { unobservedA++; });
      onBecomeUnobserved(store, "b", () => { unobservedB++; });

      const dispose = createRoot((d) => {
        createMemo(() => store.a)();
        obs(() => store.a);
        createEffect(() => { void store.b; });
        obs(() => store.b);
        return d;
      });

      // 2 observers on each property (1 from Solid computation + 1 from obs)
      expect(observerCount(store, "a")).toBe(2);
      expect(observerCount(store, "b")).toBe(2);

      dispose();

      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
      // onBecomeUnobserved fires once per property (≥1→0 transition), not per-observer
      expect(unobservedA).toBe(1);
      expect(unobservedB).toBe(1);
    });

    it("double bridge — updates propagate through both bridges independently", () => {
      const store = observable({ count: 0 });
      const memoValues: number[] = [];
      let accessor!: () => number;

      const dispose = createRoot((d) => {
        const m = createMemo(() => store.count);
        createEffect(() => { memoValues.push(m()); });
        accessor = obs(() => store.count);
        return d;
      });

      expect(memoValues).toEqual([0]);
      expect(accessor()).toBe(0);

      action(() => { store.count = 5; })();
      expect(memoValues).toEqual([0, 5]);
      expect(accessor()).toBe(5);

      action(() => { store.count = 10; })();
      expect(memoValues).toEqual([0, 5, 10]);
      expect(accessor()).toBe(10);

      dispose();

      action(() => { store.count = 20; })();
      expect(memoValues).toEqual([0, 5, 10]); // stale
      expect(accessor()).toBe(10); // stale
    });
  });

  describe("obs", () => {
    it("autorun observes while alive and releases on dispose", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const dispose = createRoot((d) => {
        obs(() => store.count);
        return d;
      });

      expect(observed).toBe(1);
      expect(observerCount(store, "count")).toBe(1);

      dispose();

      expect(unobserved).toBe(1);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("does not accumulate autoruns across re-runs", () => {
      const store = observable({ count: 0 });

      createRoot(() => {
        const accessor = obs(() => store.count);
        expect(accessor()).toBe(0);

        for (let i = 1; i <= 50; i++) {
          action(() => {
            store.count = i;
          })();
          expect(accessor()).toBe(i);
          expect(observerCount(store, "count")).toBe(1);
        }
      });
    });

    it("stops updating Solid signal after dispose (no zombie)", () => {
      const store = observable({ count: 0 });
      let accessor!: () => number;

      const dispose = createRoot((d) => {
        accessor = obs(() => store.count);
        return d;
      });

      expect(accessor()).toBe(0);
      action(() => {
        store.count = 1;
      })();
      expect(accessor()).toBe(1);

      dispose();

      action(() => {
        store.count = 2;
      })();
      // Accessor is stale — autorun no longer pushes updates
      expect(accessor()).toBe(1);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("disposes each of many independent obs bridges", () => {
      const store = observable({ count: 0 });
      const disposers: Array<() => void> = [];

      for (let i = 0; i < 30; i++) {
        disposers.push(
          createRoot((d) => {
            obs(() => store.count);
            return d;
          }),
        );
      }

      expect(observerCount(store, "count")).toBe(30);

      for (const dispose of disposers) {
        dispose();
      }

      expect(observerCount(store, "count")).toBe(0);
    });

    it("create/dispose cycles do not leak autoruns", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const CYCLES = 100;
      for (let i = 0; i < CYCLES; i++) {
        const dispose = createRoot((d) => {
          obs(() => store.count);
          return d;
        });
        expect(observerCount(store, "count")).toBe(1);
        dispose();
        expect(observerCount(store, "count")).toBe(0);
      }

      expect(observed).toBe(CYCLES);
      expect(unobserved).toBe(CYCLES);
    });

    it("releases all deps when getter tracks multiple observables", () => {
      const store = observable({ x: 1, y: 2 });
      let unobservedX = 0;
      let unobservedY = 0;
      onBecomeUnobserved(store, "x", () => {
        unobservedX++;
      });
      onBecomeUnobserved(store, "y", () => {
        unobservedY++;
      });

      const dispose = createRoot((d) => {
        obs(() => store.x + store.y);
        return d;
      });

      expect(observerCount(store, "x")).toBe(1);
      expect(observerCount(store, "y")).toBe(1);

      dispose();

      expect(observerCount(store, "x")).toBe(0);
      expect(observerCount(store, "y")).toBe(0);
      expect(unobservedX).toBe(1);
      expect(unobservedY).toBe(1);
    });

    it("nested obs inside conditional effect cleans up", () => {
      const store = observable({ count: 0 });
      let setVisible!: (v: boolean) => void;
      let unobserved = 0;
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      createRoot(() => {
        const [visible, set] = createSignal(true);
        setVisible = set;
        createEffect(() => {
          if (!visible()) return;
          obs(() => store.count);
        });
      });

      expect(observerCount(store, "count")).toBe(1);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(1);

      setVisible(true);
      expect(observerCount(store, "count")).toBe(1);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(2);
    });
  });
});

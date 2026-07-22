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
  createSignal,
} from "solid-js";
import { enableObservableTracking } from "../src/enable-observable-tracking";
import { fromObservable } from "../src/from-observable";
import { createLocalObservable } from "../src/create-local-observable";
import { observerCount, observerNames } from "./helpers";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("memory / reaction disposal", () => {
  beforeEach(() => {
    ensureBinding();
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

  describe("fromObservable", () => {
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
        fromObservable(() => store.count);
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
        const accessor = fromObservable(() => store.count);
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
        accessor = fromObservable(() => store.count);
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

    it("disposes each of many independent fromObservable bridges", () => {
      const store = observable({ count: 0 });
      const disposers: Array<() => void> = [];

      for (let i = 0; i < 30; i++) {
        disposers.push(
          createRoot((d) => {
            fromObservable(() => store.count);
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
          fromObservable(() => store.count);
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
        fromObservable(() => store.x + store.y);
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

    it("nested fromObservable inside conditional effect cleans up", () => {
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
          fromObservable(() => store.count);
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

  describe("createLocalObservable", () => {
    it("creates no observers until something tracks it", () => {
      const store = createLocalObservable(() => ({ count: 0 }));
      expect(observerCount(store, "count")).toBe(0);
    });

    it("releases observers when Solid tracking root is disposed", () => {
      const store = createLocalObservable(() => ({
        count: 0,
        get double() {
          return this.count * 2;
        },
      }));
      let unobservedCount = 0;
      onBecomeUnobserved(store, "count", () => {
        unobservedCount++;
      });

      const dispose = createRoot((d) => {
        createMemo(() => store.double)();
        return d;
      });

      expect(observerCount(store, "count")).toBeGreaterThan(0);

      dispose();

      expect(observerCount(store, "count")).toBe(0);
      expect(unobservedCount).toBe(1);
    });

    it("does not leak across createLocalObservable + tracking cycles", () => {
      let observed = 0;
      let unobserved = 0;
      const CYCLES = 50;

      for (let i = 0; i < CYCLES; i++) {
        const store = createLocalObservable(() => ({ count: 0 }));
        onBecomeObserved(store, "count", () => {
          observed++;
        });
        onBecomeUnobserved(store, "count", () => {
          unobserved++;
        });

        const dispose = createRoot((d) => {
          createMemo(() => store.count)();
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
    });

    it("many local stores dispose independently", () => {
      const stores = Array.from({ length: 20 }, () =>
        createLocalObservable(() => ({ count: 0 })),
      );
      const disposers = stores.map((store) =>
        createRoot((d) => {
          createMemo(() => store.count)();
          return d;
        }),
      );

      for (const store of stores) {
        expect(observerCount(store, "count")).toBe(1);
      }

      disposers[0]();
      expect(observerCount(stores[0], "count")).toBe(0);
      for (let i = 1; i < stores.length; i++) {
        expect(observerCount(stores[i], "count")).toBe(1);
      }

      for (let i = 1; i < disposers.length; i++) {
        disposers[i]();
      }

      for (const store of stores) {
        expect(observerCount(store, "count")).toBe(0);
      }
    });
  });
});

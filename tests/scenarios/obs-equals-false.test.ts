/**
 * Critical: obs() creates a Solid signal with `equals: false`,
 * so when the MobX autorun re-runs with the same returned value,
 * Solid dependents still re-evaluate.
 */
import { describe, it, expect } from "vitest";
import { observable, action } from "mobx";
import { createEffect, createRoot } from "solid-js";
import { obs } from "../../src/obs";

describe("scenario: obs equals: false", () => {
  it("re-notifies Solid when autorun re-runs with the same primitive", () => {
    const store = observable({ value: 1, tick: 0 });
    const ticks: number[] = [];

    const dispose = createRoot((d) => {
      // Changing `tick` re-runs autorun while `value` stays the same.
      const value = obs(() => {
        void store.tick;
        return store.value;
      });
      createEffect(() => {
        ticks.push(value());
      });
      return d;
    });

    expect(ticks).toEqual([1]);

    action(() => {
      store.tick = 1;
    })();
    expect(ticks).toEqual([1, 1]);

    action(() => {
      store.tick = 2;
    })();
    expect(ticks).toEqual([1, 1, 1]);

    dispose();
  });

  it("re-notifies Solid when autorun re-runs with the same object reference", () => {
    const shared = { id: 1 };
    const store = observable({ item: shared, tick: 0 });
    const ticks: Array<{ id: number }> = [];

    const dispose = createRoot((d) => {
      const item = obs(() => {
        void store.tick;
        return store.item;
      });
      createEffect(() => {
        ticks.push(item());
      });
      return d;
    });

    expect(ticks).toHaveLength(1);

    action(() => {
      store.tick = 1;
    })();
    expect(ticks).toHaveLength(2);
    // Same observable proxy reference (MobX wraps plain objects).
    expect(ticks[1]).toBe(ticks[0]);

    dispose();
  });
});

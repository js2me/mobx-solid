import { describe, it, expect } from "vitest";
import { observable, action } from "mobx";
import { createRoot, createSignal, createEffect } from "solid-js";
import { obs } from "../../src/obs";

describe("obs", () => {
  it("converts a MobX observable getter to a SolidJS accessor", () => {
    const store = observable({ count: 0 });

    let accessor: () => number;
    createRoot((dispose) => {
      accessor = obs(() => store.count);
    });

    expect(accessor!()).toBe(0);
  });

  it("accessor updates when MobX observable changes", () => {
    const store = observable({ count: 0 });

    let accessor: () => number;
    createRoot((dispose) => {
      accessor = obs(() => store.count);
    });

    expect(accessor!()).toBe(0);

    action(() => { store.count = 5; })();
    expect(accessor!()).toBe(5);

    action(() => { store.count = 10; })();
    expect(accessor!()).toBe(10);
  });

  it("works with computed values", () => {
    const store = observable({
      count: 0,
      get double() {
        return this.count * 2;
      },
    });

    let accessor: () => number;
    createRoot((dispose) => {
      accessor = obs(() => store.double);
    });

    expect(accessor!()).toBe(0);

    action(() => { store.count = 3; })();
    expect(accessor!()).toBe(6);
  });

  it("cleans up MobX autorun on disposal", () => {
    const store = observable({ count: 0 });
    const values: number[] = [];

    const dispose = createRoot((dispose) => {
      const accessor = obs(() => store.count);

      createEffect(() => {
        values.push(accessor());
      });

      return dispose;
    });

    expect(values).toEqual([0]);

    action(() => { store.count = 1; })();
    expect(values).toEqual([0, 1]);

    dispose();

    action(() => { store.count = 2; })();
    // No new values after disposal
    expect(values).toEqual([0, 1]);
  });

  it("works with objects (in-place mutation)", () => {
    const store = observable({ items: [1, 2, 3] });

    let accessor: () => number[];
    createRoot((dispose) => {
      accessor = obs(() => [...store.items]);
    });

    expect(accessor!()).toEqual([1, 2, 3]);

    action(() => { store.items.push(4); })();
    expect(accessor!()).toEqual([1, 2, 3, 4]);
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { createRoot, createEffect } from "solid-js";
import { enableObservableTracking } from "../src/enable-observable-tracking";
import { enableStaticRendering } from "../src/static-rendering";
import { Observer } from "../src/observer-component";

// Ensure binding is enabled once
let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("Observer", () => {
  beforeEach(() => {
    ensureBinding();
    enableStaticRendering(false);
  });

  afterEach(() => {
    enableStaticRendering(false);
  });

  it("renders children function", () => {
    const result = createRoot((dispose) => {
      return Observer({ children: () => "hello" });
    });

    // Observer returns a memo accessor
    expect(typeof result).toBe("function");
    expect((result as () => string)()).toBe("hello");
  });

  it("tracks MobX observable changes", () => {
    const store = observable({ count: 0 });

    let accessor: () => unknown;
    createRoot((dispose) => {
      accessor = Observer({ children: () => store.count }) as () => unknown;
    });

    expect(accessor!()).toBe(0);

    action(() => { store.count = 7; })();
    expect(accessor!()).toBe(7);
  });

  it("works with computed MobX values", () => {
    const store = observable({
      count: 2,
      get double() {
        return this.count * 2;
      },
    });

    let accessor: () => unknown;
    createRoot((dispose) => {
      accessor = Observer({ children: () => store.double }) as () => unknown;
    });

    expect(accessor!()).toBe(4);

    action(() => { store.count = 5; })();
    expect(accessor!()).toBe(10);
  });

  it("works with createEffect for reactive consumption", () => {
    const store = observable({ count: 0 });
    const values: number[] = [];

    createRoot((dispose) => {
      const accessor = Observer({ children: () => store.count }) as () => number;

      createEffect(() => {
        values.push(accessor());
      });
    });

    expect(values).toEqual([0]);

    action(() => { store.count = 3; })();
    expect(values).toEqual([0, 3]);
  });

  it("in static rendering mode, calls children without MobX tracking", () => {
    enableStaticRendering(true);

    const store = observable({ count: 0 });

    let result: unknown;
    createRoot((dispose) => {
      result = Observer({ children: () => store.count });
    });

    // In static rendering, Observer returns the value directly (not accessor)
    expect(result).toBe(0);
  });
});

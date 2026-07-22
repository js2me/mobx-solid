import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { createRoot, createEffect } from "solid-js";
import {
  enableObservableTracking,
  isObservableTrackingEnabled,
  resetObservableTrackingForTests,
} from "../src/enable-observable-tracking";
import { enableStaticRendering } from "../src/static-rendering";
import { observer } from "../src/observer";

// Ensure binding is enabled once
let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("observer", () => {
  beforeEach(() => {
    ensureBinding();
    enableStaticRendering(false);
  });

  afterEach(() => {
    enableStaticRendering(false);
  });

  it("wraps a component function and preserves behavior", () => {
    const store = observable({ count: 0 });

    const Component = observer(() => {
      return store.count;
    });

    let result: unknown;
    createRoot((dispose) => {
      result = Component({});
    });

    // observer returns a memo accessor — call it to get the value
    expect(typeof result).toBe("function");
    expect((result as () => number)()).toBe(0);
  });

  it("component re-evaluates when MobX observable changes", () => {
    const store = observable({ count: 0 });

    const Component = observer(() => {
      return store.count;
    });

    let accessor: () => number;
    createRoot((dispose) => {
      accessor = Component({}) as () => number;
    });

    expect(accessor!()).toBe(0);

    action(() => { store.count = 5; })();
    expect(accessor!()).toBe(5);
  });

  it("preserves displayName", () => {
    function MyComponent() {
      return 0;
    }
    MyComponent.displayName = "MyComponent";

    const wrapped = observer(MyComponent);
    expect(wrapped.displayName).toBe("MyComponent");
  });

  it("preserves function name when no displayName", () => {
    function MyComponent() {
      return 0;
    }

    const wrapped = observer(MyComponent);
    expect(wrapped.displayName).toBe("MyComponent");
  });

  it("returns component as-is in static rendering mode", () => {
    enableStaticRendering(true);

    const Component = () => 42;
    const wrapped = observer(Component);

    // In static rendering, observer returns the component unchanged
    expect(wrapped).toBe(Component);
  });

  it("works with createEffect for reactive consumption", () => {
    const store = observable({ count: 0 });
    const values: number[] = [];

    createRoot((dispose) => {
      const Component = observer(() => store.count);
      const accessor = Component({}) as () => number;

      createEffect(() => {
        values.push(accessor());
      });
    });

    expect(values).toEqual([0]);

    action(() => { store.count = 1; })();
    expect(values).toEqual([0, 1]);

    action(() => { store.count = 2; })();
    expect(values).toEqual([0, 1, 2]);
  });

  describe("deferred binding check (ESM import order)", () => {
    afterEach(() => {
      // Restore for subsequent tests in this file / worker
      enableObservableTracking();
      bindingInitialized = true;
    });

    it("does not throw when observer() wraps before enableObservableTracking", () => {
      resetObservableTrackingForTests();
      expect(isObservableTrackingEnabled()).toBe(false);

      // Simulates `export const Comp = observer(...)` during module evaluation,
      // which runs before the app entry point body calls enableObservableTracking().
      expect(() => {
        observer(() => null);
      }).not.toThrow();
    });

    it("throws on first render if tracking was never enabled", () => {
      resetObservableTrackingForTests();
      const Comp = observer(() => 0);

      expect(() => {
        createRoot((dispose) => {
          Comp({});
          dispose();
        });
      }).toThrow(/Observable tracking is not enabled/);
    });

    it("allows wrap → enable → render (playground / ESM entry order)", () => {
      resetObservableTrackingForTests();
      expect(isObservableTrackingEnabled()).toBe(false);

      const store = observable({ count: 7 });
      // 1. Module scope: wrap components while tracking is still off
      const Comp = observer(() => store.count);

      // 2. Entry point body: enable before render()
      enableObservableTracking();
      expect(isObservableTrackingEnabled()).toBe(true);

      // 3. First render: binding check passes
      let accessor: () => number;
      createRoot(() => {
        accessor = Comp({}) as () => number;
      });

      expect(accessor!()).toBe(7);

      action(() => {
        store.count = 11;
      })();
      expect(accessor!()).toBe(11);
    });
  });
});

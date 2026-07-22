import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { createRoot, createEffect } from "solid-js";
import { enableObservableTracking } from "../src/enable-observable-tracking";
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
});

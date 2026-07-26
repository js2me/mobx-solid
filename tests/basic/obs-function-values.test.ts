import { describe, it, expect, beforeEach } from "vitest";
import { observable, action } from "mobx";
import { createRoot } from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";

describe("obs() with function values", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  it("obs() stores a function value correctly — not invoked as Solid updater", () => {
    const store = observable({ onClick: () => "clicked" });

    const dispose = createRoot((d) => {
      const onClick = obs(() => store.onClick);

      // The value must be a function (not its return value)
      expect(typeof onClick()).toBe("function");
      // Calling it must produce the original result — not undefined
      // (without the () => v wrapper, Solid would call onClick(prevValue)
      // and store the return value, making onClick() === "clicked" instead of a fn)
      expect(onClick()()).toBe("clicked");
      return d;
    });

    // After mutation, new function value is stored correctly
    action(() => { store.onClick = () => "tapped"; })();
    const onClick = obs(() => store.onClick);
    expect(typeof onClick()).toBe("function");
    expect(onClick()()).toBe("tapped");

    dispose();
  });

  it("obs() with function value — updates propagate correctly", () => {
    const store = observable({ fn: () => 1 });

    const dispose = createRoot((d) => {
      const fnAccessor = obs(() => store.fn);

      expect(fnAccessor()()).toBe(1);

      action(() => { store.fn = () => 2; })();
      expect(fnAccessor()()).toBe(2);

      action(() => { store.fn = () => 3; })();
      expect(fnAccessor()()).toBe(3);

      return d;
    });

    dispose();
  });

  it("obs() with function value — equals:false re-notifies on mutation", () => {
    const store = observable({ fn: () => "a" });
    let values: string[] = [];

    const dispose = createRoot((d) => {
      const accessor = obs(() => store.fn);

      values.push(accessor()());
      action(() => { store.fn = () => "b"; })();
      values.push(accessor()());
      action(() => { store.fn = () => "c"; })();
      values.push(accessor()());

      return d;
    });

    dispose();
    expect(values).toEqual(["a", "b", "c"]);
  });
});

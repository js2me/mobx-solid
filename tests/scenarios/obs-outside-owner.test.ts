import { describe, it, expect, vi, beforeEach } from "vitest";
import { observable, action, onBecomeObserved, onBecomeUnobserved } from "mobx";
import { createRoot } from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "../basic/helpers";

describe("scenario: obs() outside Solid owner", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  it("obs() called outside createRoot — autorun is never disposed (memory leak)", () => {
    const store = observable({ count: 0 });
    let observed = 0;
    let unobserved = 0;

    onBecomeObserved(store, "count", () => { observed++; });
    onBecomeUnobserved(store, "count", () => { unobserved++; });

    // Call obs() WITHOUT createRoot — no Solid owner context
    const accessor = obs(() => store.count);

    // Autorun is created and runs — onBecomeObserved fires
    expect(observed).toBe(1);
    expect(observerCount(store, "count")).toBe(1);

    // Accessor works — updates propagate
    expect(accessor()).toBe(0);
    action(() => { store.count = 5; })();
    expect(accessor()).toBe(5);

    // onCleanup has no owner to register with — autorun stays alive forever
    action(() => { store.count = 10; })();
    expect(accessor()).toBe(10);
    expect(observerCount(store, "count")).toBe(1);

    // There is NO way to dispose this autorun — it's a memory leak
    // onBecomeUnobserved never fires
    expect(unobserved).toBe(0);
  });

  it("obs() outside createRoot — signal is NOT reactive inside Solid computations", () => {
    const store = observable({ count: 0 });

    // obs() outside createRoot creates an autorun but the Solid signal
    // is not connected to a reactive owner scope
    const accessor = obs(() => store.count);

    expect(accessor()).toBe(0);

    // Updates still push into the signal via the autorun
    action(() => { store.count = 7; })();
    expect(accessor()).toBe(7);
  });

  it("obs() inside createRoot is properly disposed — contrast with outside", () => {
    const store = observable({ count: 0 });
    let unobserved = 0;

    onBecomeUnobserved(store, "count", () => { unobserved++; });

    const dispose = createRoot((d) => {
      obs(() => store.count);
      return d;
    });

    expect(observerCount(store, "count")).toBe(1);

    // Inside createRoot — onCleanup works, disposal is clean
    dispose();
    expect(observerCount(store, "count")).toBe(0);
    expect(unobserved).toBe(1);
  });

  it("multiple obs() outside createRoot — each creates a permanent autorun", () => {
    const store = observable({ x: 1, y: 2 });

    // Two obs() calls without createRoot
    const x = obs(() => store.x);
    const y = obs(() => store.y);

    expect(observerCount(store, "x")).toBe(1);
    expect(observerCount(store, "y")).toBe(1);

    // Updates propagate — both autoruns are alive
    action(() => { store.x = 10; })();
    expect(x()).toBe(10);

    action(() => { store.y = 20; })();
    expect(y()).toBe(20);

    // Both autoruns persist — no disposal possible
    expect(observerCount(store, "x")).toBe(1);
    expect(observerCount(store, "y")).toBe(1);
  });
});

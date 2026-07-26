import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  observable,
  action,
  onBecomeObserved,
  onBecomeUnobserved,
} from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "./helpers";

describe("obs() accessor shared across components", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  afterEach(() => {
    cleanup();
  });

  it("two components share same store.x — unmount one does not break the other", () => {
    const store = observable({ x: 1 });
    let observed = 0;
    let unobserved = 0;

    onBecomeObserved(store, "x", () => { observed++; });
    onBecomeUnobserved(store, "x", () => { unobserved++; });

    const CompA = () => {
      const x = obs(() => store.x);
      return <span data-testid="a">{x()}</span>;
    };

    const CompB = () => {
      const x = obs(() => store.x);
      return <span data-testid="b">{x()}</span>;
    };

    const { unmount: unmountA } = render(() => <CompA />);
    const { getByTestId: getByB, unmount: unmountB } = render(() => <CompB />);

    // Each component has its own obs() autorun — total 2 observers
    expect(observerCount(store, "x")).toBe(2);

    // Unmount CompA — only its autorun is disposed
    unmountA();
    expect(observerCount(store, "x")).toBe(1);

    // CompB still works — mutation propagates to its accessor
    action(() => { store.x = 42; })();
    expect(getByB("b").textContent).toBe("42");
    expect(observerCount(store, "x")).toBe(1);

    // Unmount CompB — last autorun disposed, no observers left
    unmountB();
    expect(observerCount(store, "x")).toBe(0);
  });

  it("three components — unmount middle one, remaining two stay reactive", () => {
    const store = observable({ x: 0 });

    const Comp1 = () => {
      const x = obs(() => store.x);
      return <span data-testid="c1">{x()}</span>;
    };
    const Comp2 = () => {
      const x = obs(() => store.x);
      return <span data-testid="c2">{x()}</span>;
    };
    const Comp3 = () => {
      const x = obs(() => store.x);
      return <span data-testid="c3">{x()}</span>;
    };

    const r1 = render(() => <Comp1 />);
    const r2 = render(() => <Comp2 />);
    const r3 = render(() => <Comp3 />);

    expect(observerCount(store, "x")).toBe(3);

    // Unmount Comp2
    r2.unmount();
    expect(observerCount(store, "x")).toBe(2);

    // Mutations still propagate to Comp1 and Comp3
    action(() => { store.x = 99; })();
    expect(r1.getByTestId("c1").textContent).toBe("99");
    expect(r3.getByTestId("c3").textContent).toBe("99");

    // Unmount remaining
    r1.unmount();
    expect(observerCount(store, "x")).toBe(1);
    r3.unmount();
    expect(observerCount(store, "x")).toBe(0);
  });

  it("each component cleanup is independent — no cross-disposal", () => {
    const store = observable({ x: 10, y: 20 });

    const CompA = () => {
      const x = obs(() => store.x);
      return <span data-testid="a">{x()}</span>;
    };

    const CompB = () => {
      const y = obs(() => store.y);
      return <span data-testid="b">{y()}</span>;
    };

    const rA = render(() => <CompA />);
    const rB = render(() => <CompB />);

    expect(observerCount(store, "x")).toBe(1);
    expect(observerCount(store, "y")).toBe(1);

    // Unmount CompA — only x autorun disposed, y autorun untouched
    rA.unmount();
    expect(observerCount(store, "x")).toBe(0);
    expect(observerCount(store, "y")).toBe(1);

    // CompB still works
    action(() => { store.y = 50; })();
    expect(rB.getByTestId("b").textContent).toBe("50");

    // Mutations to x don't affect CompB (CompA is already gone)
    action(() => { store.x = 999; })();
    expect(observerCount(store, "x")).toBe(0); // no zombie

    rB.unmount();
    expect(observerCount(store, "y")).toBe(0);
  });

  it("onBecomeObserved/onBecomeUnobserved fire correctly with shared accessor", () => {
    const store = observable({ x: 0 });
    let observed = 0;
    let unobserved = 0;

    onBecomeObserved(store, "x", () => { observed++; });
    onBecomeUnobserved(store, "x", () => { unobserved++; });

    const Comp = () => {
      const x = obs(() => store.x);
      return <span data-testid="v">{x()}</span>;
    };

    const r1 = render(() => <Comp />);
    const r2 = render(() => <Comp />);

    // onBecomeObserved fires once when first observer attaches (0→1 transition)
    expect(observed).toBe(1);
    expect(observerCount(store, "x")).toBe(2);

    // Unmount one — count drops to 1, but onBecomeUnobserved does NOT fire yet
    // (it fires only when going from ≥1 to 0)
    r1.unmount();
    expect(observerCount(store, "x")).toBe(1);
    expect(unobserved).toBe(0); // still has one observer

    // Unmount last — onBecomeUnobserved fires (1→0 transition)
    r2.unmount();
    expect(observerCount(store, "x")).toBe(0);
    expect(unobserved).toBe(1); // fires once on 1→0
    expect(observed).toBe(1);
  });

  it("shared accessor with different getters — each component tracks different properties", () => {
    const store = observable({ a: 1, b: 2, c: 3 });

    const CompA = () => {
      const val = obs(() => store.a);
      return <span data-testid="a">{val()}</span>;
    };

    const CompB = () => {
      const val = obs(() => store.b);
      return <span data-testid="b">{val()}</span>;
    };

    const CompC = () => {
      const val = obs(() => store.c);
      return <span data-testid="c">{val()}</span>;
    };

    const rA = render(() => <CompA />);
    const rB = render(() => <CompB />);
    const rC = render(() => <CompC />);

    expect(observerCount(store, "a")).toBe(1);
    expect(observerCount(store, "b")).toBe(1);
    expect(observerCount(store, "c")).toBe(1);

    // Unmount CompB — only b observers are removed
    rB.unmount();
    expect(observerCount(store, "a")).toBe(1);
    expect(observerCount(store, "b")).toBe(0);
    expect(observerCount(store, "c")).toBe(1);

    // CompA and CompC still reactive
    action(() => { store.a = 10; })();
    expect(rA.getByTestId("a").textContent).toBe("10");

    action(() => { store.c = 30; })();
    expect(rC.getByTestId("c").textContent).toBe("30");

    rA.unmount();
    rC.unmount();
    expect(observerCount(store, "a")).toBe(0);
    expect(observerCount(store, "c")).toBe(0);
  });

  it("re-mount after full unmount — fresh autoruns, no stale state", () => {
    const store = observable({ x: 1 });

    const Comp = () => {
      const x = obs(() => store.x);
      return <span data-testid="v">{x()}</span>;
    };

    // First mount
    const r1 = render(() => <Comp />);
    expect(r1.getByTestId("v").textContent).toBe("1");
    action(() => { store.x = 2; })();
    expect(r1.getByTestId("v").textContent).toBe("2");
    r1.unmount();
    expect(observerCount(store, "x")).toBe(0);

    // Mutate while unmounted — no stale updates
    action(() => { store.x = 10; })();
    expect(observerCount(store, "x")).toBe(0);

    // Re-mount — gets fresh state
    const r2 = render(() => <Comp />);
    expect(r2.getByTestId("v").textContent).toBe("10");
    expect(observerCount(store, "x")).toBe(1);

    r2.unmount();
    expect(observerCount(store, "x")).toBe(0);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { observable, action, onBecomeObserved, onBecomeUnobserved } from "mobx";
import { renderToString } from "solid-js/web";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "./helpers";

describe("SSR — renderToString with MobX observables", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  it("renders initial MobX state to string", () => {
    const store = observable({ count: 42 });

    const Counter = () => <span>{store.count}</span>;

    const html = renderToString(() => <Counter />);
    expect(html).toContain("42");
  });

  it("renders computed values to string", () => {
    const store = observable({
      count: 5,
      get double() {
        return this.count * 2;
      },
    });

    const Counter = () => (
      <div>
        <span>{store.count}</span>
        <span>{store.double}</span>
      </div>
    );

    const html = renderToString(() => <Counter />);
    expect(html).toContain("5");
    expect(html).toContain("10");
  });

  it("renders conditional MobX state to string", () => {
    const store = observable({ visible: true, label: "Hello SSR" });

    const Conditional = () => (
      <div>
        {store.visible ? <span>{store.label}</span> : <span>Hidden</span>}
      </div>
    );

    const html = renderToString(() => <Conditional />);
    expect(html).toContain("Hello SSR");
    expect(html).not.toContain("Hidden");
  });

  it("renders list from MobX observable array to string", () => {
    const store = observable({ items: ["A", "B", "C"] });

    const List = () => (
      <ul>
        {store.items.map((item) => (
          <li>{item}</li>
        ))}
      </ul>
    );

    const html = renderToString(() => <List />);
    expect(html).toContain("A");
    expect(html).toContain("B");
    expect(html).toContain("C");
    expect(html).toContain("<li");
    expect(html).toContain("</li>");
  });

  it("no MobX reactions leak after SSR — store changes do not cause errors", () => {
    const store = observable({ count: 0 });

    const Counter = () => <span>{store.count}</span>;

    renderToString(() => <Counter />);

    expect(() => {
      action(() => { store.count = 99; })();
    }).not.toThrow();
  });

  it("renders multiple components to string", () => {
    const storeA = observable({ value: "A" });
    const storeB = observable({ value: "B" });

    const CompA = () => <span>{storeA.value}</span>;
    const CompB = () => <span>{storeB.value}</span>;

    const html = renderToString(() => (
      <div>
        <CompA />
        <CompB />
      </div>
    ));
    expect(html).toContain("A");
    expect(html).toContain("B");
  });

  it("renders alongside static content in SSR", () => {
    const store = observable({ value: "dynamic" });

    const html = renderToString(() => (
      <div>
        <span>static</span>
        <span>{store.value}</span>
      </div>
    ));

    expect(html).toContain("static");
    expect(html).toContain("dynamic");
  });

  describe("SSR cleanup — observer lifecycle", () => {
    it("JSX direct reads leave no MobX observers after renderToString", () => {
      const store = observable({ count: 0 });

      const Counter = () => <span>{store.count}</span>;

      renderToString(() => <Counter />);

      // In SSR mode, SolidJS does not create reactive computations
      // for JSX expressions, so no MobX observers are ever registered.
      expect(observerCount(store, "count")).toBe(0);
    });

    it("onBecomeObserved / onBecomeUnobserved never fire for JSX in SSR", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;

      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const Counter = () => <span>{store.count}</span>;

      renderToString(() => <Counter />);

      // SSR reads observables directly without creating MobX reactions,
      // so both hooks remain at 0.
      expect(observed).toBe(0);
      expect(unobserved).toBe(0);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("multiple properties leave no observers after SSR", () => {
      const store = observable({ a: 1, b: 2 });

      const View = () => (
        <div>
          <span>{store.a}</span>
          <span>{store.b}</span>
        </div>
      );

      renderToString(() => <View />);

      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
    });

    it("no zombie updates after SSR — reaction does not fire on store change", () => {
      const store = observable({ count: 0 });
      let effectRuns = 0;

      const Counter = () => {
        effectRuns++;
        return <span>{store.count}</span>;
      };

      renderToString(() => <Counter />);
      const runsAfterSSR = effectRuns;

      action(() => { store.count = 1; })();
      expect(effectRuns).toBe(runsAfterSSR);
      expect(observerCount(store, "count")).toBe(0);
    });
  });

  describe("SSR + obs()", () => {
    it("renders obs() accessor value in SSR", () => {
      const store = observable({ count: 42 });

      const Counter = () => {
        const count = obs(() => store.count);
        return <span>{count()}</span>;
      };

      const html = renderToString(() => <Counter />);
      expect(html).toContain("42");
    });

    it("renders computed value via obs() in SSR", () => {
      const store = observable({
        items: [1, 2, 3],
        get total() {
          return this.items.reduce((sum, i) => sum + i, 0);
        },
      });

      const Total = () => {
        const total = obs(() => store.total);
        return <span>{total()}</span>;
      };

      const html = renderToString(() => <Total />);
      expect(html).toContain("6");
    });

    it("obs() does NOT create MobX observer in SSR — no zombie leak", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;

      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const Counter = () => {
        const count = obs(() => store.count);
        return <span>{count()}</span>;
      };

      renderToString(() => <Counter />);

      // In SSR, obs() skips creating a MobX reaction entirely.
      // The signal holds the initial value for rendering, but no
      // observer is registered — no zombie leak.
      expect(observed).toBe(0);
      expect(unobserved).toBe(0);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("obs() signal is static in SSR — mutations after renderToString do not propagate", () => {
      const store = observable({ count: 0 });
      let accessor!: () => number;

      const Counter = () => {
        accessor = obs(() => store.count);
        return <span>{accessor()}</span>;
      };

      renderToString(() => <Counter />);

      // In SSR, obs() returns a static signal (no MobX reaction).
      // Mutations after renderToString do NOT propagate to the signal,
      // which is the correct behavior — there's no DOM to update.
      expect(accessor()).toBe(0);
      action(() => { store.count = 10; })();
      expect(accessor()).toBe(0); // static — no reaction to push updates

      expect(observerCount(store, "count")).toBe(0);
    });

    it("JSX direct read and obs() both leave no observers in SSR", () => {
      const store = observable({ x: 10, y: 20 });

      const View = () => {
        const x = obs(() => store.x);
        return (
          <span>
            {x()}:{store.y}
          </span>
        );
      };

      renderToString(() => <View />);

      // Neither obs() nor JSX direct reads create MobX observers in SSR
      expect(observerCount(store, "x")).toBe(0);
      expect(observerCount(store, "y")).toBe(0);
    });

    it("multiple obs() bridges leave no observers in SSR", () => {
      const store = observable({ a: 1, b: 2, c: 3 });

      const View = () => {
        const a = obs(() => store.a);
        const b = obs(() => store.b);
        const c = obs(() => store.c);
        return <span>{a()}+{b()}+{c()}</span>;
      };

      renderToString(() => <View />);

      // No zombie reactions from any obs() call in SSR
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
      expect(observerCount(store, "c")).toBe(0);
    });
  });

  describe("SSR obs() — leak is eliminated (no zombie autorun)", () => {
    it("no zombie fires on store mutation after SSR — side effects don't accumulate", () => {
      const store = observable({ count: 0 });
      let sideEffectRuns = 0;

      const Component = () => {
        const count = obs(() => {
          sideEffectRuns++;
          return store.count;
        });
        return <span>{count()}</span>;
      };

      renderToString(() => <Component />);
      const runsAfterSSR = sideEffectRuns;

      // No zombie: mutations do NOT trigger the getter again
      action(() => { store.count = 1; })();
      expect(sideEffectRuns).toBe(runsAfterSSR);

      action(() => { store.count = 2; })();
      expect(sideEffectRuns).toBe(runsAfterSSR);

      action(() => { store.count = 3; })();
      action(() => { store.count = 4; })();
      action(() => { store.count = 5; })();
      expect(sideEffectRuns).toBe(runsAfterSSR);
    });

    it("no zombie signal updates after SSR — signal stays at initial value", () => {
      const store = observable({ value: "initial" });
      let accessor!: () => string;

      const Component = () => {
        accessor = obs(() => store.value);
        return <span>{accessor()}</span>;
      };

      renderToString(() => <Component />);

      // Signal stays at initial value — no zombie updates
      expect(accessor()).toBe("initial");

      action(() => { store.value = "update1"; })();
      expect(accessor()).toBe("initial");

      action(() => { store.value = "update2"; })();
      expect(accessor()).toBe("initial");

      // No observer — observable is free for GC/unobserved lifecycle
      expect(observerCount(store, "value")).toBe(0);
    });

    it("onBecomeObserved / onBecomeUnobserved lifecycle is correct in SSR with obs()", () => {
      const store = observable({ data: "hello" });
      let observed = 0;
      let unobserved = 0;

      onBecomeObserved(store, "data", () => { observed++; });
      onBecomeUnobserved(store, "data", () => { unobserved++; });

      const Component = () => {
        const data = obs(() => store.data);
        return <span>{data()}</span>;
      };

      renderToString(() => <Component />);

      // No reaction created in SSR — lifecycle hooks never fire
      expect(observed).toBe(0);
      expect(unobserved).toBe(0);

      // Mutations don't change anything — no zombie observing
      action(() => { store.data = "world"; })();
      expect(observed).toBe(0);
      expect(unobserved).toBe(0);
      expect(observerCount(store, "data")).toBe(0);

      // This means cleanup logic tied to onBecomeUnobserved works correctly:
      // no stale observer keeps the property in "observed" state.
    });

    it("multiple obs() calls in SSR — no zombie, each stays at initial value", () => {
      const store = observable({ a: 0, b: 0 });
      let accessorA!: () => number;
      let accessorB!: () => number;
      let runsA = 0;
      let runsB = 0;

      const Component = () => {
        accessorA = obs(() => { runsA++; return store.a; });
        accessorB = obs(() => { runsB++; return store.b; });
        return <span>{accessorA()}:{accessorB()}</span>;
      };

      renderToString(() => <Component />);
      const initialA = runsA;
      const initialB = runsB;

      // Mutate a — no zombie fires for either accessor
      action(() => { store.a = 1; })();
      expect(runsA).toBe(initialA);
      expect(runsB).toBe(initialB);

      // Mutate b — no zombie fires
      action(() => { store.b = 1; })();
      expect(runsA).toBe(initialA);
      expect(runsB).toBe(initialB);

      // Both accessors remain at their initial values
      expect(accessorA()).toBe(0);
      expect(accessorB()).toBe(0);
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
    });

    it("obs() does not keep MobX observable in observed state — allows GC", () => {
      const store = observable({ tempData: "should be GC'd after SSR" });

      const Component = () => {
        const data = obs(() => store.tempData);
        return <span>{data()}</span>;
      };

      renderToString(() => <Component />);

      // No zombie observer — the observable is free for GC
      expect(observerCount(store, "tempData")).toBe(0);

      // Setting to null doesn't create any zombie issues
      action(() => { store.tempData = null as unknown as string; })();
      expect(observerCount(store, "tempData")).toBe(0);
    });
  });
});

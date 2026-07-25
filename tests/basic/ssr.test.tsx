import { describe, it, expect, beforeEach } from "vitest";
import { observable, action, onBecomeObserved, onBecomeUnobserved } from "mobx";
import { renderToString } from "solid-js/web";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "./helpers";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("SSR — renderToString with MobX observables", () => {
  beforeEach(() => {
    ensureBinding();
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

    it("obs() autorun registers MobX observer during SSR (onBecomeObserved fires)", () => {
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

      // obs() creates a MobX autorun, so onBecomeObserved fires.
      expect(observed).toBe(1);
      // In SSR, renderToString does not trigger Solid onCleanup,
      // so the autorun remains alive and onBecomeUnobserved does NOT fire.
      expect(unobserved).toBe(0);
      expect(observerCount(store, "count")).toBe(1);
    });

    it("obs() autorun remains active after SSR — store changes still propagate to signal", () => {
      const store = observable({ count: 0 });
      let accessor!: () => number;

      const Counter = () => {
        accessor = obs(() => store.count);
        return <span>{accessor()}</span>;
      };

      renderToString(() => <Counter />);

      // Autorun is still alive — mutations update the Solid signal.
      action(() => { store.count = 10; })();
      expect(accessor()).toBe(10);

      expect(observerCount(store, "count")).toBe(1);
    });

    it("JSX direct read leaves no observer; obs() on same store leaves one", () => {
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

      // obs() creates an autorun → observer on store.x
      expect(observerCount(store, "x")).toBe(1);
      // JSX direct read → no MobX observer on store.y
      expect(observerCount(store, "y")).toBe(0);
    });

    it("multiple obs() bridges each leave one active autorun after SSR", () => {
      const store = observable({ a: 1, b: 2, c: 3 });

      const View = () => {
        const a = obs(() => store.a);
        const b = obs(() => store.b);
        const c = obs(() => store.c);
        return <span>{a()}+{b()}+{c()}</span>;
      };

      renderToString(() => <View />);

      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(1);
      expect(observerCount(store, "c")).toBe(1);
    });
  });
});

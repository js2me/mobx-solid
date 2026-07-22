import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../src/enable-observable-tracking";
import { enableStaticRendering } from "../src/static-rendering";
import { Observer } from "../src/observer-component";
import { fromObservable } from "../src/from-observable";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("Observer component — real SolidJS component tests", () => {
  beforeEach(() => {
    ensureBinding();
    enableStaticRendering(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("renders children with MobX observables", async () => {
    const store = observable({ count: 0 });

    const { getByTestId } = render(() => (
      <Observer>{() => <span data-testid="count">{store.count}</span>}</Observer>
    ));

    expect(getByTestId("count").textContent).toBe("0");
  });

  it("updates DOM when MobX observable changes", async () => {
    const store = observable({ count: 0 });

    const { getByTestId } = render(() => (
      <Observer>{() => <span data-testid="count">{store.count}</span>}</Observer>
    ));

    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 7; })();
    expect(getByTestId("count").textContent).toBe("7");
  });

  it("works alongside static JSX content", async () => {
    const store = observable({ count: 0 });

    const { getByTestId } = render(() => (
      <div>
        <span data-testid="static">Static</span>
        <Observer>
          {() => <span data-testid="dynamic">{store.count}</span>}
        </Observer>
      </div>
    ));

    expect(getByTestId("static").textContent).toBe("Static");
    expect(getByTestId("dynamic").textContent).toBe("0");

    action(() => { store.count = 5; })();
    expect(getByTestId("static").textContent).toBe("Static");
    expect(getByTestId("dynamic").textContent).toBe("5");
  });

  it("handles multiple Observer boundaries", async () => {
    const storeA = observable({ value: "A" });
    const storeB = observable({ value: "B" });

    const { getByTestId } = render(() => (
      <div>
        <Observer>{() => <span data-testid="a">{storeA.value}</span>}</Observer>
        <Observer>{() => <span data-testid="b">{storeB.value}</span>}</Observer>
      </div>
    ));

    expect(getByTestId("a").textContent).toBe("A");
    expect(getByTestId("b").textContent).toBe("B");

    action(() => { storeA.value = "A2"; })();
    expect(getByTestId("a").textContent).toBe("A2");
    expect(getByTestId("b").textContent).toBe("B");

    action(() => { storeB.value = "B2"; })();
    expect(getByTestId("a").textContent).toBe("A2");
    expect(getByTestId("b").textContent).toBe("B2");
  });
});

describe("fromObservable — real SolidJS component tests", () => {
  beforeEach(() => {
    enableStaticRendering(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("works inside a SolidJS component", async () => {
    const store = observable({ count: 0 });

    const Counter = () => {
      const count = fromObservable(() => store.count);
      return <span data-testid="count">{count()}</span>;
    };

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 10; })();
    expect(getByTestId("count").textContent).toBe("10");
  });

  it("works with computed values", async () => {
    const store = observable({
      items: [1, 2, 3],
      get total() {
        return this.items.reduce((sum, i) => sum + i, 0);
      },
    });

    const Total = () => {
      const total = fromObservable(() => store.total);
      return <span data-testid="total">{total()}</span>;
    };

    const { getByTestId } = render(() => <Total />);
    expect(getByTestId("total").textContent).toBe("6");

    action(() => { store.items.push(4); })();
    expect(getByTestId("total").textContent).toBe("10");
  });

  it("works alongside enableObservableTracking without conflicts", async () => {
    ensureBinding();

    const store = observable({ count: 0 });

    const Counter = () => {
      // Both mechanisms should work together
      const fromObservableCount = fromObservable(() => store.count);
      return <span data-testid="count">{fromObservableCount()}</span>;
    };

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 5; })();
    expect(getByTestId("count").textContent).toBe("5");
  });
});

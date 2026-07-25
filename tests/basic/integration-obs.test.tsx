import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";

describe("obs — real SolidJS component tests", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  afterEach(() => {
    cleanup();
  });

  it("works inside a SolidJS component", async () => {
    const store = observable({ count: 0 });

    const Counter = () => {
      const count = obs(() => store.count);
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
      const total = obs(() => store.total);
      return <span data-testid="total">{total()}</span>;
    };

    const { getByTestId } = render(() => <Total />);
    expect(getByTestId("total").textContent).toBe("6");

    action(() => { store.items.push(4); })();
    expect(getByTestId("total").textContent).toBe("10");
  });

  it("works alongside enableObservableTracking without conflicts", async () => {
    const store = observable({ count: 0 });

    const Counter = () => {
      const obsCount = obs(() => store.count);
      return <span data-testid="count">{obsCount()}</span>;
    };

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 5; })();
    expect(getByTestId("count").textContent).toBe("5");
  });

  it("stale snapshot — capturing accessor() value in component body does not update", async () => {
    const store = observable({ count: 0 });

    // Calling the accessor and saving the result in the body
    // captures the initial signal value (undefined), not the tracked value.
    // The component body runs once; `n` is a plain snapshot, not reactive.
    const Bad = () => {
      const accessor = obs(() => store.count);
      const n = accessor(); // stale snapshot — captures initial signal value
      return <span data-testid="count">{String(n)}</span>;
    };

    const { getByTestId } = render(() => <Bad />);
    // Initial signal value before autorun settles is undefined
    expect(getByTestId("count").textContent).toBe("undefined");

    action(() => { store.count = 42; })();
    // Stays stale — Solid does not re-run the component body
    expect(getByTestId("count").textContent).toBe("undefined");
  });

  it("reactive access via accessor() in JSX stays current", async () => {
    const store = observable({ count: 0 });

    const Good = () => {
      const count = obs(() => store.count);
      // accessor() inside JSX is tracked by Solid
      return <span data-testid="count">{count()}</span>;
    };

    const { getByTestId } = render(() => <Good />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 42; })();
    expect(getByTestId("count").textContent).toBe("42");
  });
});

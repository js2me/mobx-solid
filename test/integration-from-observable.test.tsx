import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../src/enable-observable-tracking";
import { fromObservable } from "../src/from-observable";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("fromObservable — real SolidJS component tests", () => {
  beforeEach(() => {
    ensureBinding();
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
    const store = observable({ count: 0 });

    const Counter = () => {
      const fromObservableCount = fromObservable(() => store.count);
      return <span data-testid="count">{fromObservableCount()}</span>;
    };

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 5; })();
    expect(getByTestId("count").textContent).toBe("5");
  });
});

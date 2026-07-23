/**
 * Critical: documented primary use-case for `obs` —
 * bridge MobX into Solid UI without calling enableObservableTracking().
 *
 * Must run in an isolated Vitest project so trackingEnabled stays false.
 */
import { describe, it, expect, afterEach } from "vitest";
import { observable, action } from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { createEffect, createRoot } from "solid-js";
import { obs } from "../../src/obs";
import { isObservableTrackingEnabled } from "../../src/enable-observable-tracking";
import { observerCount } from "../basic/helpers";

describe("scenario: obs without enableObservableTracking", () => {
  afterEach(() => {
    cleanup();
  });

  it("global tracking is not enabled in this process", () => {
    expect(isObservableTrackingEnabled()).toBe(false);
  });

  it("direct MobX reads in JSX are not reactive without global tracking", async () => {
    const store = observable({ count: 0 });

    const Counter = () => <span data-testid="count">{store.count}</span>;

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => {
      store.count = 7;
    })();

    expect(getByTestId("count").textContent).toBe("0");
  });

  it("obs updates the DOM when MobX changes", async () => {
    const store = observable({ count: 0 });

    const Counter = () => {
      const count = obs(() => store.count);
      return <span data-testid="count">{count()}</span>;
    };

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => {
      store.count = 10;
    })();
    expect(getByTestId("count").textContent).toBe("10");

    action(() => {
      store.count = 42;
    })();
    expect(getByTestId("count").textContent).toBe("42");
  });

  it("obs works with MobX computed in a component", async () => {
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

    action(() => {
      store.items.push(4);
    })();
    expect(getByTestId("total").textContent).toBe("10");
  });

  it("obs autorun is disposed on unmount", () => {
    const store = observable({ count: 0 });

    const Counter = () => {
      const count = obs(() => store.count);
      return <span>{count()}</span>;
    };

    const { unmount } = render(() => <Counter />);
    expect(observerCount(store, "count")).toBe(1);

    unmount();
    expect(observerCount(store, "count")).toBe(0);
  });

  it("obs drives createEffect without global tracking", () => {
    const store = observable({ count: 0 });
    const values: number[] = [];

    const dispose = createRoot((d) => {
      const count = obs(() => store.count);
      createEffect(() => {
        values.push(count());
      });
      return d;
    });

    expect(values).toEqual([0]);

    action(() => {
      store.count = 3;
    })();
    expect(values).toEqual([0, 3]);

    dispose();
    action(() => {
      store.count = 99;
    })();
    expect(values).toEqual([0, 3]);
  });
});

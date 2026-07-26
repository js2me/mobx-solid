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

  it("capturing accessor() in component body — no longer stale (was undefined before fix)", async () => {
    const store = observable({ count: 0 });

    // Before the infinite-loop fix, obs() initialized the signal to undefined
    // and the autorun's first setValue settled the real value. Capturing
    // accessor() in the body grabbed undefined (a stale snapshot).
    //
    // Now, obs() reads the getter upfront (inside untrack) and initializes
    // the signal with the correct value. So capturing accessor() in the
    // body gives the right initial value — but it's STILL a non-reactive
    // snapshot: mutations won't update `n` because Solid doesn't re-run
    // the component body.
    const Bad = () => {
      const accessor = obs(() => store.count);
      const n = accessor(); // snapshot — correct initial value, but not reactive
      return <span data-testid="count">{String(n)}</span>;
    };

    const { getByTestId } = render(() => <Bad />);
    // Initial value is now correct (not undefined)
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 42; })();
    // Still stale — Solid does not re-run the component body,
    // so `n` stays at 0 even though the signal has moved to 42.
    expect(getByTestId("count").textContent).toBe("0");
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

  /**
   * NOTE: The obs() signal initial value pitfall is now resolved.
   *
   * Before the infinite-loop fix, obs() initialized the signal to undefined
   * and the autorun's first setValue settled the real value. This caused:
   * - Capturing accessor() in body → got undefined (stale snapshot)
   * - Accessing .length on accessor result → TypeError or wrong value
   *
   * Now, obs() reads the getter upfront (inside untrack) and initializes
   * the signal with the correct value. The stale-snapshot issue is gone —
   * capturing accessor() in the body gives the right initial value (though
   * it's still a non-reactive snapshot that doesn't update on mutations).
   *
   * For .length on observable arrays, the recommended pattern remains:
   * use obs(() => store.items.length) instead of obs(() => store.items)() + .length.
   * This is because obs(() => store.items)() returns the MobX proxy array,
   * and accessing its .length in a Solid JSX expression reads a MobX-tracked
   * property outside of the obs() bridge's tracking scope.
   */
  it("accessor().length on observable array — use obs(() => arr.length) instead", () => {
    const store = observable({ items: [1, 2, 3] });

    // Pattern A: obs(() => store.items)() + ?.length — works but needs
    // optional chaining as a workaround for the MobX proxy array.
    // handle this differently than expected.
    const Wrong = () => {
      const items = obs(() => store.items);
      // items() might be undefined on initial read before autorun settles
      return <span data-testid="wrong">{items()?.length ?? 0}</span>;
    };

    // CORRECT: obs(() => store.items.length) — the getter computes
    // the length directly in the autorun, so the signal always has
    // the correct number value (undefined → 3 on first autorun run).
    const Correct = () => {
      const itemLength = obs(() => store.items.length);
      return <span data-testid="correct">{itemLength()}</span>;
    };

    const { getByTestId: wrongGetByTestId } = render(() => <Wrong />);
    // Using ?.length handles the undefined case, but it's a workaround
    expect(wrongGetByTestId("wrong").textContent).toBe("3");
    cleanup();

    const { getByTestId: correctGetByTestId } = render(() => <Correct />);
    // The correct approach gives the right value without workarounds
    expect(correctGetByTestId("correct").textContent).toBe("3");

    // After mutation, both update correctly
    action(() => { store.items.push(4); })();
    expect(correctGetByTestId("correct").textContent).toBe("4");
  });
});

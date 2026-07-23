import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("Hydration — client-side reactivity after SSR", () => {
  beforeEach(() => {
    ensureBinding();
  });

  afterEach(() => {
    cleanup();
  });

  it("client-side component updates after simulated SSR", async () => {
    const store = observable({ count: 0 });

    const Counter = () => <span data-testid="count">{store.count}</span>;

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 42; })();
    expect(getByTestId("count").textContent).toBe("42");
  });

  it("obs works on client side after SSR concept", async () => {
    const store = observable({ count: 10 });

    const Counter = () => {
      const count = obs(() => store.count);
      return <span data-testid="count">{count()}</span>;
    };

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("10");

    action(() => { store.count = 20; })();
    expect(getByTestId("count").textContent).toBe("20");
  });

  it("shared MobX store updates across multiple components on client", async () => {
    const store = observable({ count: 0 });

    const Display = () => <span data-testid="display">{store.count}</span>;

    const IncrementButton = () => (
      <button
        data-testid="increment"
        onClick={action(() => store.count++)}
      >
        +
      </button>
    );

    const App = () => (
      <div>
        <Display />
        <IncrementButton />
      </div>
    );

    const { getByTestId } = render(() => <App />);
    expect(getByTestId("display").textContent).toBe("0");

    getByTestId("increment").click();
    expect(getByTestId("display").textContent).toBe("1");

    getByTestId("increment").click();
    expect(getByTestId("display").textContent).toBe("2");
  });

  it("rapid updates work on client side", async () => {
    const store = observable({ value: 0 });

    const Counter = () => <span data-testid="value">{store.value}</span>;

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("value").textContent).toBe("0");

    action(() => {
      for (let i = 1; i <= 50; i++) {
        store.value = i;
      }
    })();

    expect(getByTestId("value").textContent).toBe("50");
  });

  it("unmount cleans up MobX reactions on client", async () => {
    const store = observable({ count: 0 });

    const Counter = () => <span data-testid="count">{store.count}</span>;

    const { getByTestId, unmount } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 1; })();
    expect(getByTestId("count").textContent).toBe("1");

    unmount();

    expect(() => {
      action(() => { store.count = 2; })();
    }).not.toThrow();
  });
});

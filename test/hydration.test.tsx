import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../src/enable-observable-tracking";
import { enableStaticRendering } from "../src/static-rendering";
import { observer } from "../src/observer";
import { Observer } from "../src/observer-component";
import { createLocalObservable } from "../src/create-local-observable";

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
    enableStaticRendering(false);
  });

  afterEach(() => {
    cleanup();
  });

  it("client-side observer component updates after simulated SSR", async () => {
    const store = observable({ count: 0 });

    // Simulate SSR: render with static rendering
    enableStaticRendering(true);
    // In SSR, observer returns the component as-is
    const Counter = observer(() => <span data-testid="count">{store.count}</span>);
    enableStaticRendering(false);

    // Client-side: render the component
    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    // Client-side update should work
    action(() => { store.count = 42; })();
    expect(getByTestId("count").textContent).toBe("42");
  });

  it("client-side Observer updates after simulated SSR", async () => {
    const store = observable({ value: "ssr" });

    enableStaticRendering(true);
    // In SSR, Observer just calls children
    enableStaticRendering(false);

    const { getByTestId } = render(() => (
      <Observer>
        {() => <span data-testid="value">{store.value}</span>}
      </Observer>
    ));

    expect(getByTestId("value").textContent).toBe("ssr");

    action(() => { store.value = "client"; })();
    expect(getByTestId("value").textContent).toBe("client");
  });

  it("createLocalObservable works on client side", async () => {
    const Counter = observer(() => {
      const store = createLocalObservable(() => ({
        count: 0,
        increment() {
          this.count++;
        },
      }));
      return (
        <div>
          <span data-testid="count">{store.count}</span>
          <button data-testid="btn" onClick={store.increment}>
            +
          </button>
        </div>
      );
    });

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    getByTestId("btn").click();
    expect(getByTestId("count").textContent).toBe("1");

    getByTestId("btn").click();
    expect(getByTestId("count").textContent).toBe("2");
  });

  it("fromObservable works on client side after SSR concept", async () => {
    const store = observable({ count: 10 });
    const { fromObservable } = await import("../src/from-observable");

    const Counter = () => {
      const count = fromObservable(() => store.count);
      return <span data-testid="count">{count()}</span>;
    };

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("10");

    action(() => { store.count = 20; })();
    expect(getByTestId("count").textContent).toBe("20");
  });

  it("shared MobX store updates across multiple components on client", async () => {
    const store = observable({ count: 0 });

    const Display = observer(() => (
      <span data-testid="display">{store.count}</span>
    ));

    const IncrementButton = observer(() => (
      <button
        data-testid="increment"
        onClick={action(() => store.count++)}
      >
        +
      </button>
    ));

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

    const Counter = observer(() => (
      <span data-testid="value">{store.value}</span>
    ));

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

    const Counter = observer(() => (
      <span data-testid="count">{store.count}</span>
    ));

    const { getByTestId, unmount } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    // Update before unmount
    action(() => { store.count = 1; })();
    expect(getByTestId("count").textContent).toBe("1");

    // Unmount — should clean up MobX reactions
    unmount();

    // After unmount, changing the store should not cause errors
    expect(() => {
      action(() => { store.count = 2; })();
    }).not.toThrow();
  });
});

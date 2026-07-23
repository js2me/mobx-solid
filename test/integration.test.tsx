import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../src/enable-observable-tracking";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("enableObservableTracking — real SolidJS component tests", () => {
  beforeEach(() => {
    ensureBinding();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders MobX observable values in JSX", async () => {
    const store = observable({ count: 0 });

    const Counter = () => <span data-testid="count">{store.count}</span>;

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");
  });

  it("updates DOM when MobX observable changes", async () => {
    const store = observable({ count: 0 });

    const Counter = () => <span data-testid="count">{store.count}</span>;

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 42; })();
    expect(getByTestId("count").textContent).toBe("42");
  });

  it("does not update when MobX value is captured in the component body", async () => {
    const store = observable({ count: 0 });

    // Body runs once — `n` is a plain snapshot, not tracked
    const Bad = () => {
      const n = store.count;
      return <span data-testid="count">{n}</span>;
    };

    const { getByTestId } = render(() => <Bad />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => {
      store.count = 42;
    })();

    // Stays stale — Solid does not re-run the component body
    expect(getByTestId("count").textContent).toBe("0");
  });

  it("tracks MobX computed values in JSX", async () => {
    const store = observable({
      count: 3,
      get double() {
        return this.count * 2;
      },
    });

    const Counter = () => (
      <div>
        <span data-testid="count">{store.count}</span>
        <span data-testid="double">{store.double}</span>
      </div>
    );

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("3");
    expect(getByTestId("double").textContent).toBe("6");

    action(() => { store.count = 10; })();
    expect(getByTestId("count").textContent).toBe("10");
    expect(getByTestId("double").textContent).toBe("20");
  });

  it("tracks multiple MobX observables in one component", async () => {
    const store = observable({ firstName: "John", lastName: "Doe" });

    const Name = () => (
      <span data-testid="name">
        {store.firstName} {store.lastName}
      </span>
    );

    const { getByTestId } = render(() => <Name />);
    expect(getByTestId("name").textContent).toBe("John Doe");

    action(() => {
      store.firstName = "Jane";
      store.lastName = "Smith";
    })();

    expect(getByTestId("name").textContent).toBe("Jane Smith");
  });

  it("handles click handlers that modify MobX observables", async () => {
    const store = observable({ count: 0 });

    const Counter = () => (
      <div>
        <span data-testid="count">{store.count}</span>
        <button
          data-testid="increment"
          onClick={action(() => store.count++)}
        >
          +
        </button>
      </div>
    );

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    getByTestId("increment").click();
    expect(getByTestId("count").textContent).toBe("1");

    getByTestId("increment").click();
    expect(getByTestId("count").textContent).toBe("2");
  });

  it("handles conditional rendering based on MobX state", async () => {
    const store = observable({ visible: true, label: "Hello" });

    const Conditional = () => (
      <div>
        {store.visible ? (
          <span data-testid="label">{store.label}</span>
        ) : (
          <span data-testid="hidden">Hidden</span>
        )}
      </div>
    );

    const { getByTestId, queryByTestId } = render(() => <Conditional />);
    expect(getByTestId("label").textContent).toBe("Hello");

    action(() => { store.label = "World"; })();
    expect(getByTestId("label").textContent).toBe("World");

    action(() => { store.visible = false; })();
    expect(queryByTestId("label")).toBeNull();
    expect(getByTestId("hidden").textContent).toBe("Hidden");
  });

  it("handles list rendering with MobX observable arrays", async () => {
    const store = observable({ items: ["Apple", "Banana"] });

    const List = () => (
      <ul data-testid="list">
        {store.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );

    const { getByTestId } = render(() => <List />);
    const list = getByTestId("list");
    expect(list.children.length).toBe(2);
    expect(list.children[0].textContent).toBe("Apple");
    expect(list.children[1].textContent).toBe("Banana");

    action(() => { store.items.push("Cherry"); })();
    expect(list.children.length).toBe(3);
    expect(list.children[2].textContent).toBe("Cherry");
  });

  it("cleans up MobX reactions on unmount", async () => {
    const store = observable({ count: 0 });

    const Counter = () => <span data-testid="count">{store.count}</span>;

    const { getByTestId, unmount } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    action(() => { store.count = 1; })();
    expect(getByTestId("count").textContent).toBe("1");

    unmount();

    action(() => { store.count = 2; })();
  });

  it("works with nested components", async () => {
    const store = observable({ count: 0 });

    const Inner = () => <span data-testid="inner">{store.count}</span>;

    const Outer = () => (
      <div data-testid="outer">
        <Inner />
      </div>
    );

    const { getByTestId } = render(() => <Outer />);
    expect(getByTestId("inner").textContent).toBe("0");

    action(() => { store.count = 5; })();
    expect(getByTestId("inner").textContent).toBe("5");
  });

  it("works with external MobX store shared across components", async () => {
    const store = observable({ count: 0 });

    const Display = () => <span data-testid="display">{store.count}</span>;

    const Controls = () => (
      <div>
        <button
          data-testid="increment"
          onClick={action(() => store.count++)}
        >
          +
        </button>
        <button
          data-testid="decrement"
          onClick={action(() => store.count--)}
        >
          -
        </button>
      </div>
    );

    const App = () => (
      <div>
        <Display />
        <Controls />
      </div>
    );

    const { getByTestId } = render(() => <App />);
    expect(getByTestId("display").textContent).toBe("0");

    getByTestId("increment").click();
    expect(getByTestId("display").textContent).toBe("1");

    getByTestId("increment").click();
    expect(getByTestId("display").textContent).toBe("2");

    getByTestId("decrement").click();
    expect(getByTestId("display").textContent).toBe("1");
  });

  it("handles rapid successive updates", async () => {
    const store = observable({ value: 0 });

    const Counter = () => <span data-testid="value">{store.value}</span>;

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("value").textContent).toBe("0");

    action(() => {
      for (let i = 1; i <= 100; i++) {
        store.value = i;
      }
    })();

    expect(getByTestId("value").textContent).toBe("100");
  });
});

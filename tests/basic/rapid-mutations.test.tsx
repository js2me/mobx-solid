import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";

describe("Rapid mutations without batching", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  afterEach(() => {
    cleanup();
  });

  it("sequential action() calls — each step correctly reflected in DOM via obs()", () => {
    const store = observable({ step: 0 });

    const Counter = () => {
      const step = obs(() => store.step);
      return <span data-testid="step">{step()}</span>;
    };

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("step").textContent).toBe("0");

    for (let i = 1; i <= 20; i++) {
      action(() => { store.step = i; })();
      expect(getByTestId("step").textContent).toBe(String(i));
    }
  });

  it("sequential action() on different fields — no stale state, each field current", () => {
    const store = observable({ a: 0, b: 0, c: 0 });

    const View = () => {
      const a = obs(() => store.a);
      const b = obs(() => store.b);
      const c = obs(() => store.c);
      return (
        <span data-testid="v">
          {a()}:{b()}:{c()}
        </span>
      );
    };

    const { getByTestId } = render(() => <View />);
    expect(getByTestId("v").textContent).toBe("0:0:0");

    // Change a
    action(() => { store.a = 1; })();
    expect(getByTestId("v").textContent).toBe("1:0:0");

    // Change b
    action(() => { store.b = 2; })();
    expect(getByTestId("v").textContent).toBe("1:2:0");

    // Change c
    action(() => { store.c = 3; })();
    expect(getByTestId("v").textContent).toBe("1:2:3");

    // Change a again
    action(() => { store.a = 10; })();
    expect(getByTestId("v").textContent).toBe("10:2:3");

    // Change b again
    action(() => { store.b = 20; })();
    expect(getByTestId("v").textContent).toBe("10:20:3");
  });

  it("rapid mutations via EOT (JSX) — no stale state", () => {
    const store = observable({ count: 0 });

    const Counter = () => <span data-testid="count">{store.count}</span>;

    const { getByTestId } = render(() => <Counter />);
    expect(getByTestId("count").textContent).toBe("0");

    for (let i = 1; i <= 20; i++) {
      action(() => { store.count = i; })();
      expect(getByTestId("count").textContent).toBe(String(i));
    }
  });

  it("rapid mutations — alternating fields, no cross-contamination", () => {
    const store = observable({ x: "X0", y: "Y0" });

    const View = () => {
      const x = obs(() => store.x);
      const y = obs(() => store.y);
      return (
        <span data-testid="v">
          {x()}|{y()}
        </span>
      );
    };

    const { getByTestId } = render(() => <View />);
    expect(getByTestId("v").textContent).toBe("X0|Y0");

    // Change x only
    action(() => { store.x = "X1"; })();
    expect(getByTestId("v").textContent).toBe("X1|Y0");

    // Change y only
    action(() => { store.y = "Y1"; })();
    expect(getByTestId("v").textContent).toBe("X1|Y1");

    // Change x again, y should stay
    action(() => { store.x = "X2"; })();
    expect(getByTestId("v").textContent).toBe("X2|Y1");

    // Change y again, x should stay
    action(() => { store.y = "Y2"; })();
    expect(getByTestId("v").textContent).toBe("X2|Y2");

    // Reset x, y untouched
    action(() => { store.x = "X0"; })();
    expect(getByTestId("v").textContent).toBe("X0|Y2");
  });

  it("rapid mutations on array items — each splice reflected immediately", () => {
    const store = observable({
      items: ["a", "b", "c", "d", "e"],
    });

    const View = () => {
      const items = obs(() => store.items);
      return (
        <ul data-testid="list">
          {items().map((item, i) => (
            <li data-testid={`item-${i}`}>{item}</li>
          ))}
        </ul>
      );
    };

    const { getByTestId, queryByTestId } = render(() => <View />);
    expect(getByTestId("item-0").textContent).toBe("a");
    expect(getByTestId("item-1").textContent).toBe("b");

    // Remove first item
    action(() => { store.items.shift(); })();
    expect(getByTestId("item-0").textContent).toBe("b");

    // Remove last item
    action(() => { store.items.pop(); })();
    expect(queryByTestId("item-3")).toBeNull();

    // Push new item
    action(() => { store.items.push("f"); })();
    expect(getByTestId("item-3").textContent).toBe("f");
  });

  it("rapid mutations — obs() accessor reads are always current, never stale", () => {
    const store = observable({ value: 0 });

    let accessor!: () => number;
    const Comp = () => {
      accessor = obs(() => store.value);
      return <span data-testid="v">{accessor()}</span>;
    };

    const { getByTestId } = render(() => <Comp />);

    for (let i = 1; i <= 10; i++) {
      action(() => { store.value = i; })();
      // Both accessor() and DOM must reflect the latest value
      expect(accessor()).toBe(i);
      expect(getByTestId("v").textContent).toBe(String(i));
    }
  });

  it("rapid mutations — double bridge (obs + JSX) both stay current", () => {
    const store = observable({ count: 0 });

    const View = () => {
      const count = obs(() => store.count);
      return (
        <span data-testid="v">
          {store.count}:{count()}
        </span>
      );
    };

    const { getByTestId } = render(() => <View />);
    expect(getByTestId("v").textContent).toBe("0:0");

    for (let i = 1; i <= 15; i++) {
      action(() => { store.count = i; })();
      expect(getByTestId("v").textContent).toBe(`${i}:${i}`);
    }
  });
});

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  observable,
  action,
  onBecomeObserved,
  onBecomeUnobserved,
} from "mobx";
import { Show, createSignal } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../src/enable-observable-tracking";
import { obs } from "../src/obs";
import { observerCount } from "./helpers";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

describe("memory / component disposal", () => {
  beforeEach(() => {
    ensureBinding();
  });

  afterEach(() => {
    cleanup();
  });

  describe("enableObservableTracking JSX", () => {
    it("unmount releases all MobX observers", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const Counter = () => <span data-testid="count">{store.count}</span>;

      const { unmount, getByTestId } = render(() => <Counter />);
      expect(getByTestId("count").textContent).toBe("0");
      expect(observed).toBeGreaterThanOrEqual(1);
      expect(observerCount(store, "count")).toBeGreaterThan(0);

      unmount();

      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(observed);

      action(() => {
        store.count = 1;
      })();
      expect(observerCount(store, "count")).toBe(0);
    });

    it("Show toggling does not leak MobX observers", () => {
      const store = observable({ count: 0 });
      const [visible, setVisible] = createSignal(true);
      let unobserved = 0;
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const Counter = () => <span data-testid="count">{store.count}</span>;

      render(() => (
        <Show when={visible()}>
          <Counter />
        </Show>
      ));

      expect(observerCount(store, "count")).toBeGreaterThan(0);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBeGreaterThanOrEqual(1);

      const before = unobserved;
      setVisible(true);
      expect(observerCount(store, "count")).toBeGreaterThan(0);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBeGreaterThan(before);
    });

    it("mount/unmount cycles do not accumulate observers", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const Counter = () => <span>{store.count}</span>;
      const CYCLES = 50;

      for (let i = 0; i < CYCLES; i++) {
        const { unmount } = render(() => <Counter />);
        expect(observerCount(store, "count")).toBeGreaterThan(0);
        unmount();
        expect(observerCount(store, "count")).toBe(0);
      }

      expect(observed).toBe(unobserved);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("nested component trees fully clean up on outer unmount", () => {
      const store = observable({ a: 0, b: 0 });

      const Inner = () => <span data-testid="b">{store.b}</span>;
      const Outer = () => (
        <div>
          <span data-testid="a">{store.a}</span>
          <Inner />
        </div>
      );

      const { unmount } = render(() => <Outer />);
      expect(observerCount(store, "a")).toBeGreaterThan(0);
      expect(observerCount(store, "b")).toBeGreaterThan(0);

      unmount();
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
    });
  });

  describe("obs", () => {
    it("autorun is disposed on unmount", () => {
      const store = observable({ count: 0 });
      let unobserved = 0;
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const View = () => {
        const count = obs(() => store.count);
        return <span data-testid="count">{count()}</span>;
      };

      const { unmount, getByTestId } = render(() => <View />);
      expect(getByTestId("count").textContent).toBe("0");
      expect(observerCount(store, "count")).toBe(1);

      unmount();
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(1);

      action(() => {
        store.count = 99;
      })();
      expect(observerCount(store, "count")).toBe(0);
    });

    it("Show toggling disposes and recreates autorun without leak", () => {
      const store = observable({ count: 0 });
      const [visible, setVisible] = createSignal(true);
      let unobserved = 0;
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const View = () => {
        const count = obs(() => store.count);
        return <span>{count()}</span>;
      };

      render(() => (
        <Show when={visible()}>
          <View />
        </Show>
      ));

      expect(observerCount(store, "count")).toBe(1);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(1);

      setVisible(true);
      expect(observerCount(store, "count")).toBe(1);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(2);
    });

    it("mount/unmount cycles do not leak autoruns", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "count", () => {
        observed++;
      });
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const View = () => {
        const count = obs(() => store.count);
        return <span>{count()}</span>;
      };

      const CYCLES = 50;
      for (let i = 0; i < CYCLES; i++) {
        const { unmount } = render(() => <View />);
        expect(observerCount(store, "count")).toBe(1);
        unmount();
        expect(observerCount(store, "count")).toBe(0);
      }

      expect(observed).toBe(CYCLES);
      expect(unobserved).toBe(CYCLES);
    });

    it("multiple obs in one component all clean up", () => {
      const store = observable({ a: 1, b: 2, c: 3 });

      const View = () => {
        const a = obs(() => store.a);
        const b = obs(() => store.b);
        const c = obs(() => store.c);
        return (
          <span>
            {a()}+{b()}+{c()}
          </span>
        );
      };

      const { unmount } = render(() => <View />);
      expect(observerCount(store, "a")).toBe(1);
      expect(observerCount(store, "b")).toBe(1);
      expect(observerCount(store, "c")).toBe(1);

      unmount();
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
      expect(observerCount(store, "c")).toBe(0);
    });
  });

  describe("combined utilities", () => {
    it("JSX tracking + obs all clean up together", () => {
      const external = observable({ flag: true });
      const local = observable({ count: 0 });

      const View = () => {
        const flag = obs(() => external.flag);
        return (
          <span data-testid="v">
            {local.count}:{String(flag())}
          </span>
        );
      };

      const { unmount, getByTestId } = render(() => <View />);
      expect(getByTestId("v").textContent).toBe("0:true");
      expect(observerCount(local, "count")).toBeGreaterThan(0);
      expect(observerCount(external, "flag")).toBe(1);

      unmount();
      expect(observerCount(local, "count")).toBe(0);
      expect(observerCount(external, "flag")).toBe(0);
    });

    it("list of rows cleans up when items are removed", () => {
      const store = observable({
        items: [
          { id: 1, label: "a" },
          { id: 2, label: "b" },
          { id: 3, label: "c" },
        ],
      });

      const Row = (props: { item: { id: number; label: string } }) => (
        <li data-testid={`row-${props.item.id}`}>{props.item.label}</li>
      );

      const List = () => (
        <ul>
          {store.items.map((item) => (
            <Row item={item} />
          ))}
        </ul>
      );

      const { unmount, queryByTestId } = render(() => <List />);
      expect(queryByTestId("row-2")).toBeTruthy();
      expect(observerCount(store, "items")).toBeGreaterThan(0);

      action(() => {
        store.items.splice(1, 1);
      })();
      expect(queryByTestId("row-2")).toBeNull();

      unmount();
      expect(observerCount(store, "items")).toBe(0);
    });
  });
});

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
import { enableStaticRendering } from "../src/static-rendering";
import { observer } from "../src/observer";
import { Observer } from "../src/observer-component";
import { fromObservable } from "../src/from-observable";
import { createLocalObservable } from "../src/create-local-observable";
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
    enableStaticRendering(false);
  });

  afterEach(() => {
    cleanup();
  });

  describe("observer", () => {
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

      const Counter = observer(() => (
        <span data-testid="count">{store.count}</span>
      ));

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

      const Counter = observer(() => (
        <span data-testid="count">{store.count}</span>
      ));

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

      const Counter = observer(() => <span>{store.count}</span>);
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

    it("nested observer trees fully clean up on outer unmount", () => {
      const store = observable({ a: 0, b: 0 });

      const Inner = observer(() => <span data-testid="b">{store.b}</span>);
      const Outer = observer(() => (
        <div>
          <span data-testid="a">{store.a}</span>
          <Inner />
        </div>
      ));

      const { unmount } = render(() => <Outer />);
      expect(observerCount(store, "a")).toBeGreaterThan(0);
      expect(observerCount(store, "b")).toBeGreaterThan(0);

      unmount();
      expect(observerCount(store, "a")).toBe(0);
      expect(observerCount(store, "b")).toBe(0);
    });
  });

  describe("Observer", () => {
    it("unmount releases MobX observers", () => {
      const store = observable({ count: 0 });

      const { unmount, getByTestId } = render(() => (
        <div>
          <Observer>
            {() => <span data-testid="count">{store.count}</span>}
          </Observer>
        </div>
      ));

      expect(getByTestId("count").textContent).toBe("0");
      expect(observerCount(store, "count")).toBeGreaterThan(0);

      unmount();
      expect(observerCount(store, "count")).toBe(0);
    });

    it("Show toggling around Observer does not leak", () => {
      const store = observable({ count: 0 });
      const [visible, setVisible] = createSignal(true);
      let unobserved = 0;
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      render(() => (
        <Show when={visible()}>
          <Observer>
            {() => <span data-testid="count">{store.count}</span>}
          </Observer>
        </Show>
      ));

      expect(observerCount(store, "count")).toBeGreaterThan(0);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBeGreaterThanOrEqual(1);

      setVisible(true);
      expect(observerCount(store, "count")).toBeGreaterThan(0);

      setVisible(false);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("mount/unmount cycles do not accumulate observers", () => {
      const store = observable({ count: 0 });
      const CYCLES = 40;

      for (let i = 0; i < CYCLES; i++) {
        const { unmount } = render(() => (
          <Observer>{() => <span>{store.count}</span>}</Observer>
        ));
        expect(observerCount(store, "count")).toBeGreaterThan(0);
        unmount();
        expect(observerCount(store, "count")).toBe(0);
      }
    });
  });

  describe("fromObservable", () => {
    it("autorun is disposed on unmount", () => {
      const store = observable({ count: 0 });
      let unobserved = 0;
      onBecomeUnobserved(store, "count", () => {
        unobserved++;
      });

      const View = () => {
        const count = fromObservable(() => store.count);
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
        const count = fromObservable(() => store.count);
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
        const count = fromObservable(() => store.count);
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

    it("multiple fromObservable in one component all clean up", () => {
      const store = observable({ a: 1, b: 2, c: 3 });

      const View = () => {
        const a = fromObservable(() => store.a);
        const b = fromObservable(() => store.b);
        const c = fromObservable(() => store.c);
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

  describe("createLocalObservable", () => {
    it("observer + local store releases observers on unmount", () => {
      let storeRef: { count: number } | undefined;
      let unobserved = 0;

      const Counter = observer(() => {
        const store = createLocalObservable(() => ({
          count: 0,
          increment() {
            this.count++;
          },
        }));
        storeRef = store;
        onBecomeUnobserved(store, "count", () => {
          unobserved++;
        });
        return (
          <button data-testid="btn" onClick={() => store.increment()}>
            {store.count}
          </button>
        );
      });

      const { unmount, getByTestId } = render(() => <Counter />);
      expect(getByTestId("btn").textContent).toBe("0");
      expect(storeRef).toBeDefined();
      expect(observerCount(storeRef!, "count")).toBeGreaterThan(0);

      unmount();
      expect(observerCount(storeRef!, "count")).toBe(0);
      expect(unobserved).toBeGreaterThanOrEqual(1);
    });

    it("mount/unmount cycles with local store do not leak", () => {
      const CYCLES = 40;
      let observed = 0;
      let unobserved = 0;

      for (let i = 0; i < CYCLES; i++) {
        let storeRef: { count: number } | undefined;

        const Counter = observer(() => {
          const store = createLocalObservable(() => ({ count: 0 }));
          storeRef = store;
          onBecomeObserved(store, "count", () => {
            observed++;
          });
          onBecomeUnobserved(store, "count", () => {
            unobserved++;
          });
          return <span>{store.count}</span>;
        });

        const { unmount } = render(() => <Counter />);
        expect(observerCount(storeRef!, "count")).toBeGreaterThan(0);
        unmount();
        expect(observerCount(storeRef!, "count")).toBe(0);
      }

      expect(observed).toBe(unobserved);
    });

    it("Show toggling with local store does not leak", () => {
      const [visible, setVisible] = createSignal(true);
      let lastStore: { count: number } | undefined;
      let unobserved = 0;

      const Counter = observer(() => {
        const store = createLocalObservable(() => ({ count: 0 }));
        lastStore = store;
        onBecomeUnobserved(store, "count", () => {
          unobserved++;
        });
        return <span data-testid="count">{store.count}</span>;
      });

      render(() => (
        <Show when={visible()}>
          <Counter />
        </Show>
      ));

      const firstStore = lastStore!;
      expect(observerCount(firstStore, "count")).toBeGreaterThan(0);

      setVisible(false);
      expect(observerCount(firstStore, "count")).toBe(0);
      expect(unobserved).toBeGreaterThanOrEqual(1);

      setVisible(true);
      const secondStore = lastStore!;
      expect(secondStore).not.toBe(firstStore);
      expect(observerCount(secondStore, "count")).toBeGreaterThan(0);

      setVisible(false);
      expect(observerCount(secondStore, "count")).toBe(0);
    });
  });

  describe("combined utilities", () => {
    it("observer + fromObservable + local store all clean up together", () => {
      const external = observable({ flag: true });
      let localRef: { count: number } | undefined;

      const View = observer(() => {
        const local = createLocalObservable(() => ({ count: 0 }));
        localRef = local;
        const flag = fromObservable(() => external.flag);
        return (
          <span data-testid="v">
            {local.count}:{String(flag())}
          </span>
        );
      });

      const { unmount, getByTestId } = render(() => <View />);
      expect(getByTestId("v").textContent).toBe("0:true");
      expect(observerCount(localRef!, "count")).toBeGreaterThan(0);
      expect(observerCount(external, "flag")).toBe(1);

      unmount();
      expect(observerCount(localRef!, "count")).toBe(0);
      expect(observerCount(external, "flag")).toBe(0);
    });

    it("list of observer rows cleans up when items are removed", () => {
      const store = observable({
        items: [
          { id: 1, label: "a" },
          { id: 2, label: "b" },
          { id: 3, label: "c" },
        ],
      });

      const Row = observer((props: { item: { id: number; label: string } }) => (
        <li data-testid={`row-${props.item.id}`}>{props.item.label}</li>
      ));

      const List = observer(() => (
        <ul>
          {store.items.map((item) => (
            <Row item={item} />
          ))}
        </ul>
      ));

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

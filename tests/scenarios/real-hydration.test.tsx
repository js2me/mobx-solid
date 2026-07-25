/**
 * Critical: after Solid `hydrate` attaches to existing DOM markup,
 * MobX still drives client updates (and cleans up on dispose).
 *
 * Markup is seeded with `data-hk` keys the hydratable client expects.
 * Isomorphic `renderToString` output is covered by `tests/basic/ssr.test.tsx`
 * (node / ssr build); browser builds cannot call `renderToString` in jsdom.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action, onBecomeUnobserved } from "mobx";
import { sharedConfig } from "solid-js";
import { hydrate } from "solid-js/web";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "../basic/helpers";

function resetHydrationRuntime() {
  sharedConfig.context = undefined;
  sharedConfig.registry = undefined;
  sharedConfig.done = false;
  (globalThis as { _$HY?: object })._$HY = {
    events: [],
    completed: new WeakSet(),
    r: {},
    done: false,
  };
}

function hydrateInto(
  html: string,
  renderFn: () => unknown,
): { root: HTMLElement; dispose: () => void } {
  resetHydrationRuntime();

  const root = document.createElement("div");
  root.innerHTML = html;
  document.body.appendChild(root);

  const dispose = hydrate(renderFn as () => void, root);

  return {
    root,
    dispose: () => {
      dispose();
      root.remove();
      resetHydrationRuntime();
    },
  };
}

describe("scenario: real hydration (SSR markup → hydrate)", () => {
  const disposers: Array<() => void> = [];

  beforeEach(() => {
    enableObservableTracking();
    document.body.innerHTML = "";
    resetHydrationRuntime();
  });

  afterEach(() => {
    while (disposers.length) disposers.pop()!();
    document.body.innerHTML = "";
    resetHydrationRuntime();
  });

  it("MobX updates DOM after hydrate", () => {
    const store = observable({ count: 0 });

    const Counter = () => <span data-testid="count">{store.count}</span>;

    // Client hydratable + enableObservableTracking nests context → key "00"
    const { root, dispose } = hydrateInto(
      `<span data-hk="00" data-testid="count">0</span>`,
      () => <Counter />,
    );
    disposers.push(dispose);

    const el = root.querySelector("[data-testid=count]")!;
    expect(el.textContent).toBe("0");
    // Still the seeded node (true hydrate), not a replaced tree
    expect(el.getAttribute("data-hk")).toBe("00");

    action(() => {
      store.count = 42;
    })();
    expect(el.textContent).toBe("42");
  });

  it("obs updates DOM after hydrate", () => {
    const store = observable({ count: 5 });

    const Counter = () => {
      const count = obs(() => store.count);
      return <span data-testid="count">{count()}</span>;
    };

    const { root, dispose } = hydrateInto(
      `<span data-hk="00" data-testid="count">5</span>`,
      () => <Counter />,
    );
    disposers.push(dispose);

    const el = root.querySelector("[data-testid=count]")!;
    expect(el.textContent).toBe("5");

    action(() => {
      store.count = 9;
    })();
    expect(el.textContent).toBe("9");
  });

  it("shared store stays reactive across two hydrated roots", () => {
    const store = observable({ value: "a" });

    const A = () => <span data-testid="a">{store.value}</span>;
    const B = () => <span data-testid="b">{store.value}</span>;

    const first = hydrateInto(
      `<span data-hk="00" data-testid="a">a</span>`,
      () => <A />,
    );
    disposers.push(first.dispose);

    const second = hydrateInto(
      `<span data-hk="00" data-testid="b">a</span>`,
      () => <B />,
    );
    disposers.push(second.dispose);

    expect(first.root.querySelector("[data-testid=a]")!.textContent).toBe("a");
    expect(second.root.querySelector("[data-testid=b]")!.textContent).toBe("a");

    action(() => {
      store.value = "b";
    })();

    expect(first.root.querySelector("[data-testid=a]")!.textContent).toBe("b");
    expect(second.root.querySelector("[data-testid=b]")!.textContent).toBe("b");
  });

  it("disposing hydrated tree releases MobX observers", () => {
    const store = observable({ count: 0 });

    const Counter = () => <span>{store.count}</span>;

    const { dispose } = hydrateInto(
      `<span data-hk="00">0</span>`,
      () => <Counter />,
    );

    expect(observerCount(store, "count")).toBeGreaterThan(0);

    dispose();
    expect(observerCount(store, "count")).toBe(0);
  });

  describe("obs() hydration", () => {
    it("obs() autorun is cleaned up when hydrated tree is disposed", () => {
      const store = observable({ count: 0 });
      let unobserved = 0;

      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const Counter = () => {
        const count = obs(() => store.count);
        return <span data-testid="count">{count()}</span>;
      };

      const { dispose } = hydrateInto(
        `<span data-hk="00" data-testid="count">0</span>`,
        () => <Counter />,
      );

      expect(observerCount(store, "count")).toBe(1);

      action(() => { store.count = 5; })();
      expect(observerCount(store, "count")).toBe(1);

      dispose();
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBe(1);
    });

    it("obs() hydrate with computed value", () => {
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

      const { dispose } = hydrateInto(
        `<span data-hk="00" data-testid="total">6</span>`,
        () => <Total />,
      );

      const el = document.querySelector("[data-testid=total]")!;
      expect(el.textContent).toBe("6");

      action(() => { store.items.push(4); })();
      expect(el.textContent).toBe("10");

      dispose();
    });
  });
});

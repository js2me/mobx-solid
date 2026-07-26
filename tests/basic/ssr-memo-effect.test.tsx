import { describe, it, expect, beforeEach } from "vitest";
import { observable, action, onBecomeObserved, onBecomeUnobserved } from "mobx";
import { renderToString } from "solid-js/web";
import { createMemo, createEffect } from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "./helpers";

/**
 * SSR bridge safety — both EOT and obs() are leak-free.
 *
 * In SSR (renderToString), SolidJS does not create persistent reactive
 * computations for JSX expressions, createMemo, createEffect, etc. The
 * EOT factory (enableObservableTracking) may be called during initial
 * evaluation, but any MobX Reactions are immediately discarded because
 * Solid doesn't maintain the reactive graph after renderToString.
 *
 * obs() also skips creating a MobX reaction in SSR entirely. It detects
 * the SSR environment (typeof window === "undefined") and returns a
 * static signal with the getter's initial value. No zombie reaction,
 * no leak — fully consistent with EOT behavior.
 */
describe("SSR — createMemo / createEffect with MobX observables", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  describe("createMemo in SSR", () => {
    it("createMemo reads MobX observable value during SSR", () => {
      const store = observable({ count: 5 });

      const Component = () => {
        const doubled = createMemo(() => store.count * 2);
        return <span>{doubled()}</span>;
      };

      const html = renderToString(() => <Component />);
      expect(html).toContain("10");
    });

    it("createMemo tracks MobX computed in SSR", () => {
      const store = observable({
        items: [1, 2, 3],
        get total() {
          return this.items.reduce((s, i) => s + i, 0);
        },
      });

      const Component = () => {
        const total = createMemo(() => store.total);
        return <span>{total()}</span>;
      };

      const html = renderToString(() => <Component />);
      expect(html).toContain("6");
    });

    it("createMemo does NOT create a persistent MobX Reaction in SSR — no leak", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;

      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const Component = () => {
        const doubled = createMemo(() => store.count * 2);
        return <span>{doubled()}</span>;
      };

      renderToString(() => <Component />);

      // In SSR mode, SolidJS does NOT create persistent reactive computations
      // for createMemo. The EOT factory is not invoked (or invoked and immediately
      // discarded), so no MobX Reaction persists after renderToString.
      // This is DIFFERENT from obs() which always creates a persistent autorun.
      expect(observed).toBe(0);
      expect(unobserved).toBe(0);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("createMemo in SSR — no zombie updates after renderToString", () => {
      const store = observable({ count: 0 });
      let memoValue!: () => number;

      const Component = () => {
        const doubled = createMemo(() => store.count * 2);
        memoValue = doubled;
        return <span>{doubled()}</span>;
      };

      renderToString(() => <Component />);

      // Initial value was computed correctly during SSR
      expect(memoValue()).toBe(0);

      // After SSR, the memo computation is gone — mutations do NOT propagate
      action(() => { store.count = 7; })();
      // The memo accessor still returns the stale initial value (no zombie Reaction)
      expect(memoValue()).toBe(0);

      // No observers remain — complete cleanup
      expect(observerCount(store, "count")).toBe(0);
    });

    it("createMemo with multiple MobX observables in SSR — no leak on any property", () => {
      const store = observable({ x: 1, y: 2 });

      const Component = () => {
        const sum = createMemo(() => store.x + store.y);
        return <span>{sum()}</span>;
      };

      renderToString(() => <Component />);

      // Neither property has a persistent MobX observer
      expect(observerCount(store, "x")).toBe(0);
      expect(observerCount(store, "y")).toBe(0);
    });
  });

  describe("createEffect in SSR", () => {
    it("createEffect does NOT run during SSR renderToString", () => {
      const store = observable({ count: 3 });
      const values: number[] = [];

      const Component = () => {
        createEffect(() => { values.push(store.count); });
        return <span>{store.count}</span>;
      };

      renderToString(() => <Component />);
      // createEffect is deferred in SolidJS — it does not run during renderToString.
      // No values are collected.
      expect(values.length).toBe(0);
    });

    it("createEffect does NOT create a MobX Reaction in SSR", () => {
      const store = observable({ count: 0 });
      let observed = 0;
      let unobserved = 0;

      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      const Component = () => {
        createEffect(() => { void store.count; });
        return <span>{store.count}</span>;
      };

      renderToString(() => <Component />);

      // No MobX Reaction was created — the effect never ran in SSR
      expect(observed).toBe(0);
      expect(unobserved).toBe(0);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("createEffect in SSR — no zombie side effects after renderToString", () => {
      const store = observable({ count: 0 });
      let sideEffectRuns = 0;

      const Component = () => {
        createEffect(() => {
          sideEffectRuns++;
          void store.count;
        });
        return <span>{store.count}</span>;
      };

      renderToString(() => <Component />);
      const runsAfterSSR = sideEffectRuns;

      // Mutations after SSR do NOT trigger the effect — no zombie
      action(() => { store.count = 1; })();
      expect(sideEffectRuns).toBe(runsAfterSSR);
      expect(observerCount(store, "count")).toBe(0);
    });
  });

  describe("EOT primitives vs obs() — both are safe in SSR", () => {
    it("EOT createMemo is safe in SSR; obs() is also safe (no leak)", () => {
      const storeMemo = observable({ count: 0 });
      const storeObs = observable({ count: 0 });

      const MemoComponent = () => {
        const doubled = createMemo(() => storeMemo.count * 2);
        return <span>{doubled()}</span>;
      };

      const ObsComponent = () => {
        const count = obs(() => storeObs.count);
        return <span>{count()}</span>;
      };

      renderToString(() => <MemoComponent />);
      renderToString(() => <ObsComponent />);

      // createMemo via EOT — no persistent MobX Reaction
      expect(observerCount(storeMemo, "count")).toBe(0);

      // obs() — now also safe in SSR (reaction is skipped)
      expect(observerCount(storeObs, "count")).toBe(0);
    });

    it("EOT JSX and obs() both leave no observers in SSR", () => {
      const store = observable({ x: 10, y: 20 });

      const View = () => {
        const x = obs(() => store.x);
        return (
          <span>
            {x()}:{store.y}
          </span>
        );
      };

      renderToString(() => <View />);

      // obs() skips reaction in SSR → no observer on store.x
      expect(observerCount(store, "x")).toBe(0);
      // JSX direct read via EOT → no persistent observer on store.y
      expect(observerCount(store, "y")).toBe(0);
    });

    it("createMemo + obs() on same store property — neither leaks in SSR", () => {
      const store = observable({ count: 0 });

      const Component = () => {
        const memoDoubled = createMemo(() => store.count * 2);
        const obsCount = obs(() => store.count);
        return (
          <span>
            {memoDoubled()}:{obsCount()}
          </span>
        );
      };

      renderToString(() => <Component />);

      // Both createMemo and obs() are safe in SSR — no observers persist
      expect(observerCount(store, "count")).toBe(0);
    });
  });
});

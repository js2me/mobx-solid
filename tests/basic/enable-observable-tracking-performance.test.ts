import { describe, it, expect, beforeEach } from "vitest";
import { observable, action } from "mobx";
import { createRoot, createMemo, createEffect } from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";

/**
 * Soft CI budgets for `enableObservableTracking` — generous enough for slow
 * CI runners, tight enough to catch order-of-magnitude regressions.
 *
 * Actual medians on a typical laptop are usually ~5–20× below these.
 */
const BUDGET = {
  create1000: 500,
  updates10k: 800,
  fanout500: 250,
  createDispose2k: 800,
  wideDeps200: 200,
} as const;

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function measureMedian(runs: number, fn: () => number): number {
  const samples: number[] = [];
  for (let i = 0; i < runs; i++) {
    samples.push(fn());
  }
  return median(samples);
}

describe("enableObservableTracking performance", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  it(`creates 1000 memos under ${BUDGET.create1000}ms`, () => {
    const createMs = measureMedian(5, () => {
      const store = observable({ count: 0 });
      const local: Array<() => void> = [];

      const t0 = performance.now();
      for (let i = 0; i < 1000; i++) {
        local.push(
          createRoot((d) => {
            createMemo(() => store.count)();
            return d;
          }),
        );
      }
      const elapsed = performance.now() - t0;

      for (const dispose of local) {
        dispose();
      }
      return elapsed;
    });

    // eslint-disable-next-line no-console
    console.log(`eot create×1000: ${createMs.toFixed(2)}ms`);
    expect(createMs).toBeLessThan(BUDGET.create1000);
  });

  it(`propagates 10_000 updates through one memo under ${BUDGET.updates10k}ms`, () => {
    const updateMs = measureMedian(5, () => {
      const store = observable({ count: 0 });
      let last = -1;

      const dispose = createRoot((d) => {
        createEffect(() => {
          last = store.count;
        });
        return d;
      });

      const t0 = performance.now();
      for (let i = 1; i <= 10_000; i++) {
        action(() => {
          store.count = i;
        })();
      }
      const elapsed = performance.now() - t0;

      expect(last).toBe(10_000);
      dispose();
      return elapsed;
    });

    // eslint-disable-next-line no-console
    console.log(`eot updates×10k: ${updateMs.toFixed(2)}ms`);
    expect(updateMs).toBeLessThan(BUDGET.updates10k);
  });

  it(`fans one update out to 500 memos under ${BUDGET.fanout500}ms`, () => {
    const fanoutMs = measureMedian(5, () => {
      const store = observable({ count: 0 });
      let sum = 0;

      const dispose = createRoot((d) => {
        const memos = Array.from({ length: 500 }, () =>
          createMemo(() => store.count),
        );
        createEffect(() => {
          sum = memos.reduce((s, m) => s + m(), 0);
        });
        return d;
      });

      const t0 = performance.now();
      action(() => {
        store.count = 1;
      })();
      const elapsed = performance.now() - t0;

      expect(sum).toBe(500);
      dispose();
      return elapsed;
    });

    // eslint-disable-next-line no-console
    console.log(`eot fanout×500: ${fanoutMs.toFixed(2)}ms`);
    expect(fanoutMs).toBeLessThan(BUDGET.fanout500);
  });

  it(`runs 2000 create/dispose cycles under ${BUDGET.createDispose2k}ms`, () => {
    const cycleMs = measureMedian(5, () => {
      const store = observable({ count: 0 });

      const t0 = performance.now();
      for (let i = 0; i < 2000; i++) {
        const dispose = createRoot((d) => {
          createMemo(() => store.count)();
          createEffect(() => {
            void store.count;
          });
          return d;
        });
        dispose();
      }
      return performance.now() - t0;
    });

    // eslint-disable-next-line no-console
    console.log(`eot create/dispose×2k: ${cycleMs.toFixed(2)}ms`);
    expect(cycleMs).toBeLessThan(BUDGET.createDispose2k);
  });

  it(`re-tracks 200 updates over 200 deps under ${BUDGET.wideDeps200}ms`, () => {
    const wideMs = measureMedian(5, () => {
      const props: Record<string, number> = {};
      for (let i = 0; i < 200; i++) {
        props[`p${i}`] = i;
      }
      const store = observable(props);
      let last = 0;

      const dispose = createRoot((d) => {
        createEffect(() => {
          let s = 0;
          for (let i = 0; i < 200; i++) {
            s += store[`p${i}`];
          }
          last = s;
        });
        return d;
      });

      const t0 = performance.now();
      for (let i = 0; i < 200; i++) {
        action(() => {
          store.p0 = i;
        })();
      }
      const elapsed = performance.now() - t0;

      // sum(0..199) - 0 + 199 = 199*200/2 + 199 = 199*101
      expect(last).toBe((199 * 200) / 2 + 199);
      dispose();
      return elapsed;
    });

    // eslint-disable-next-line no-console
    console.log(`eot wide-deps×200: ${wideMs.toFixed(2)}ms`);
    expect(wideMs).toBeLessThan(BUDGET.wideDeps200);
  });
});

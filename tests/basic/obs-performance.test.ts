import { describe, it, expect } from "vitest";
import { observable, action } from "mobx";
import { createRoot } from "solid-js";
import { obs } from "../../src/obs";

/**
 * Soft CI budgets for `obs`.
 * Local medians (approx): create×1k ~2–5ms, updates×10k ~15–40ms,
 * fanout×500 <1ms, create/dispose×2k ~4–10ms.
 * Budgets leave ~20–50× headroom for slow CI runners.
 */
const BUDGET = {
  create1000: 150,
  updates10k: 500,
  fanout500: 50,
  createDispose2k: 200,
} as const;

const RUNS = 5;

function median(samples: number[]): number {
  const sorted = [...samples].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)]!;
}

function measureMedian(fn: () => number): number {
  return median(Array.from({ length: RUNS }, fn));
}

describe("obs performance", () => {
  it(`creates 1000 bridges under ${BUDGET.create1000}ms`, () => {
    const ms = measureMedian(() => {
      const store = observable({ count: 0 });
      const disposers: Array<() => void> = [];

      const t0 = performance.now();
      for (let i = 0; i < 1000; i++) {
        disposers.push(
          createRoot((d) => {
            obs(() => store.count);
            return d;
          }),
        );
      }
      const elapsed = performance.now() - t0;

      for (const dispose of disposers) {
        dispose();
      }
      return elapsed;
    });

    console.log(`obs create×1000: ${ms.toFixed(2)}ms`);
    expect(ms).toBeLessThan(BUDGET.create1000);
  });

  it(`propagates 10_000 updates through one bridge under ${BUDGET.updates10k}ms`, () => {
    const ms = measureMedian(() => {
      const store = observable({ count: 0 });
      let count!: () => number;

      const dispose = createRoot((d) => {
        count = obs(() => store.count);
        return d;
      });

      const t0 = performance.now();
      for (let i = 1; i <= 10_000; i++) {
        action(() => {
          store.count = i;
        })();
      }
      const elapsed = performance.now() - t0;

      expect(count()).toBe(10_000);
      dispose();
      return elapsed;
    });

    console.log(`obs updates×10k: ${ms.toFixed(2)}ms`);
    expect(ms).toBeLessThan(BUDGET.updates10k);
  });

  it(`fans one update out to 500 bridges under ${BUDGET.fanout500}ms`, () => {
    const ms = measureMedian(() => {
      const store = observable({ count: 0 });
      let accessors!: Array<() => number>;

      const dispose = createRoot((d) => {
        accessors = Array.from({ length: 500 }, () => obs(() => store.count));
        return d;
      });

      const t0 = performance.now();
      action(() => {
        store.count = 1;
      })();
      const elapsed = performance.now() - t0;

      expect(accessors.reduce((s, a) => s + a(), 0)).toBe(500);
      dispose();
      return elapsed;
    });

    console.log(`obs fanout×500: ${ms.toFixed(2)}ms`);
    expect(ms).toBeLessThan(BUDGET.fanout500);
  });

  it(`runs 2000 create/dispose cycles under ${BUDGET.createDispose2k}ms`, () => {
    const ms = measureMedian(() => {
      const store = observable({ count: 0 });

      const t0 = performance.now();
      for (let i = 0; i < 2000; i++) {
        const dispose = createRoot((d) => {
          obs(() => store.count);
          return d;
        });
        dispose();
      }
      return performance.now() - t0;
    });

    console.log(`obs create/dispose×2k: ${ms.toFixed(2)}ms`);
    expect(ms).toBeLessThan(BUDGET.createDispose2k);
  });
});

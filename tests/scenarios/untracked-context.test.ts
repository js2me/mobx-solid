/**
 * Critical: enableObservableTracking passes MobX `untracked` as the
 * second argument to Solid's enableExternalSource, so Solid `untrack`
 * also disables MobX dependency collection inside bridged computations.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { observable, action } from "mobx";
import { createEffect, createMemo, createRoot, untrack } from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";

describe("scenario: Solid untrack + MobX untracked bridge", () => {
  beforeAll(() => {
    enableObservableTracking();
  });

  it("MobX reads inside untrack do not re-run Solid effects", () => {
    const store = observable({ tracked: 0, ignored: 0 });
    const values: number[] = [];

    const dispose = createRoot((d) => {
      createEffect(() => {
        const a = store.tracked;
        const b = untrack(() => store.ignored);
        values.push(a + b);
      });
      return d;
    });

    expect(values).toEqual([0]);

    action(() => {
      store.ignored = 10;
    })();
    expect(values).toEqual([0]);

    action(() => {
      store.tracked = 1;
    })();
    expect(values).toEqual([0, 11]);

    action(() => {
      store.ignored = 100;
    })();
    expect(values).toEqual([0, 11]);

    dispose();
  });

  it("createMemo ignores MobX deps read under untrack", () => {
    const store = observable({ a: 1, b: 10 });
    const values: number[] = [];

    const dispose = createRoot((d) => {
      const memo = createMemo(
        () => store.a + untrack(() => store.b),
      );

      createEffect(() => {
        values.push(memo());
      });
      return d;
    });

    expect(values).toEqual([11]);

    action(() => {
      store.b = 99;
    })();
    expect(values).toEqual([11]);

    action(() => {
      store.a = 2;
    })();
    expect(values).toEqual([11, 101]);

    dispose();
  });
});

import { describe, it, expect } from "vitest";
import { observable, computed, action } from "mobx";
import { createLocalObservable } from "../src/create-local-observable";

describe("createLocalObservable", () => {
  it("creates an observable from an initializer", () => {
    const store = createLocalObservable(() => ({
      count: 0,
    }));

    expect(store.count).toBe(0);
  });

  it("returns a MobX observable", () => {
    const store = createLocalObservable(() => ({
      count: 0,
    }));

    // Writing to a MobX observable should work
    store.count = 5;
    expect(store.count).toBe(5);
  });

  it("supports methods with autoBind", () => {
    const store = createLocalObservable(() => ({
      count: 0,
      increment() {
        this.count++;
      },
    }));

    const increment = store.increment;
    increment();
    expect(store.count).toBe(1);
  });

  it("supports computed properties", () => {
    const store = createLocalObservable(() => ({
      count: 3,
      get double() {
        return this.count * 2;
      },
    }));

    expect(store.double).toBe(6);
    store.count = 5;
    expect(store.double).toBe(10);
  });

  it("supports annotations", () => {
    const store = createLocalObservable(
      () => ({
        items: [] as number[],
        get count() {
          return this.items.length;
        },
      }),
      { items: observable.shallow },
    );

    store.items.push(1, 2, 3);
    expect(store.count).toBe(3);
  });
});

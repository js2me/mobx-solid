import { describe, it, expect, beforeEach } from "vitest";
import { observable, action } from "mobx";
import { createRoot, createSignal, createEffect, createMemo } from "solid-js";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "./helpers";

describe("obs", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  it("converts a MobX observable getter to a SolidJS accessor", () => {
    const store = observable({ count: 0 });

    let accessor: () => number;
    createRoot((dispose) => {
      accessor = obs(() => store.count);
    });

    expect(accessor!()).toBe(0);
  });

  it("accessor updates when MobX observable changes", () => {
    const store = observable({ count: 0 });

    let accessor: () => number;
    createRoot((dispose) => {
      accessor = obs(() => store.count);
    });

    expect(accessor!()).toBe(0);

    action(() => { store.count = 5; })();
    expect(accessor!()).toBe(5);

    action(() => { store.count = 10; })();
    expect(accessor!()).toBe(10);
  });

  it("works with computed values", () => {
    const store = observable({
      count: 0,
      get double() {
        return this.count * 2;
      },
    });

    let accessor: () => number;
    createRoot((dispose) => {
      accessor = obs(() => store.double);
    });

    expect(accessor!()).toBe(0);

    action(() => { store.count = 3; })();
    expect(accessor!()).toBe(6);
  });

  it("cleans up MobX autorun on disposal", () => {
    const store = observable({ count: 0 });
    const values: number[] = [];

    const dispose = createRoot((dispose) => {
      const accessor = obs(() => store.count);

      createEffect(() => {
        values.push(accessor());
      });

      return dispose;
    });

    expect(values).toEqual([0]);

    action(() => { store.count = 1; })();
    expect(values).toEqual([0, 1]);

    dispose();

    action(() => { store.count = 2; })();
    // No new values after disposal
    expect(values).toEqual([0, 1]);
  });

  it("works with objects (in-place mutation)", () => {
    const store = observable({ items: [1, 2, 3] });

    let accessor: () => number[];
    createRoot((dispose) => {
      accessor = obs(() => [...store.items]);
    });

    expect(accessor!()).toEqual([1, 2, 3]);

    action(() => { store.items.push(4); })();
    expect(accessor!()).toEqual([1, 2, 3, 4]);
  });

  describe("deep nested observables", () => {
    it("obs() tracks deeply nested MobX property", () => {
      const store = observable({ user: { profile: { name: "Alice" } } });

      let accessor: () => string;
      createRoot((d) => {
        accessor = obs(() => store.user.profile.name);
        return d;
      });

      expect(accessor()).toBe("Alice");

      action(() => { store.user.profile.name = "Bob"; })();
      expect(accessor()).toBe("Bob");

      action(() => { store.user = { profile: { name: "Carol" } }; })();
      expect(accessor()).toBe("Carol");
    });

    it("obs() cleans up all intermediate observers on dispose", () => {
      const store = observable({ user: { profile: { name: "Alice" } } });

      const dispose = createRoot((d) => {
        obs(() => store.user.profile.name);
        return d;
      });

      expect(observerCount(store, "user")).toBe(1);
      expect(observerCount(store.user, "profile")).toBe(1);
      expect(observerCount(store.user.profile, "name")).toBe(1);

      dispose();

      expect(observerCount(store, "user")).toBe(0);
      expect(observerCount(store.user, "profile")).toBe(0);
      expect(observerCount(store.user.profile, "name")).toBe(0);
    });
  });

  describe("observable.array mutations", () => {
    it("splice — remove and insert", () => {
      const store = observable({ items: [1, 2, 3, 4] });

      let accessor: () => number[];
      createRoot((d) => {
        accessor = obs(() => [...store.items]);
        return d;
      });

      expect(accessor()).toEqual([1, 2, 3, 4]);

      action(() => { store.items.splice(1, 2, 10, 20); })();
      expect(accessor()).toEqual([1, 10, 20, 4]);
    });

    it("shift", () => {
      const store = observable({ items: [1, 2, 3] });

      let accessor: () => number[];
      createRoot((d) => {
        accessor = obs(() => [...store.items]);
        return d;
      });

      action(() => { store.items.shift(); })();
      expect(accessor()).toEqual([2, 3]);
    });

    it("unshift", () => {
      const store = observable({ items: [2, 3] });

      let accessor: () => number[];
      createRoot((d) => {
        accessor = obs(() => [...store.items]);
        return d;
      });

      expect(accessor()).toEqual([2, 3]);

      action(() => { store.items.unshift(1, 0); })();
      expect(accessor()).toEqual([1, 0, 2, 3]);
    });

    it("replace (whole array)", () => {
      const store = observable({ items: [1, 2, 3] });

      let accessor: () => number[];
      createRoot((d) => {
        accessor = obs(() => [...store.items]);
        return d;
      });

      expect(accessor()).toEqual([1, 2, 3]);

      action(() => { store.items = [10, 20]; })();
      expect(accessor()).toEqual([10, 20]);
    });

    it("clear", () => {
      const store = observable({ items: [1, 2, 3] });

      let accessor: () => number[];
      createRoot((d) => {
        accessor = obs(() => [...store.items]);
        return d;
      });

      action(() => { store.items.clear(); })();
      expect(accessor()).toEqual([]);
    });

    it("remove", () => {
      const store = observable({ items: [1, 2, 3, 2] });

      let accessor: () => number[];
      createRoot((d) => {
        accessor = obs(() => [...store.items]);
        return d;
      });

      action(() => { store.items.remove(2); })();
      expect(accessor()).toEqual([1, 3, 2]); // removes first occurrence
    });

    it("enableObservableTracking — createEffect tracks array mutations", () => {
      const store = observable({ items: ["a", "b", "c"] });
      const values: string[][] = [];

      createRoot((d) => {
        createEffect(() => { values.push([...store.items]); });
        return d;
      });

      expect(values).toEqual([["a", "b", "c"]]);

      action(() => { store.items.splice(1, 1, "x"); })();
      expect(values[values.length - 1]).toEqual(["a", "x", "c"]);

      action(() => { store.items.push("d"); })();
      expect(values[values.length - 1]).toEqual(["a", "x", "c", "d"]);
    });

    it("enableObservableTracking — createMemo tracks array length", () => {
      const store = observable({ items: [1, 2] });
      let memo!: () => number;

      createRoot((d) => {
        memo = createMemo(() => store.items.length);
        return d;
      });

      expect(memo()).toBe(2);

      action(() => { store.items.push(3); })();
      expect(memo()).toBe(3);

      action(() => { store.items.shift(); })();
      expect(memo()).toBe(2);
    });

    it("obs() + enableObservableTracking — both bridges react to splice", () => {
      const store = observable({ items: [1, 2] });
      const obsValues: number[][] = [];
      const eotValues: number[][] = [];

      createRoot((d) => {
        const accessor = obs(() => [...store.items]);
        createEffect(() => { eotValues.push([...store.items]); });
        createEffect(() => { obsValues.push(accessor()); });
        return d;
      });

      action(() => { store.items.splice(1, 0, 5); })();
      expect(obsValues[obsValues.length - 1]).toEqual([1, 5, 2]);
      expect(eotValues[eotValues.length - 1]).toEqual([1, 5, 2]);
    });
  });

  describe("primitive types", () => {
    it("string", () => {
      const store = observable({ name: "hello" });

      let accessor: () => string;
      createRoot((d) => {
        accessor = obs(() => store.name);
        return d;
      });

      expect(accessor()).toBe("hello");

      action(() => { store.name = "world"; })();
      expect(accessor()).toBe("world");

      action(() => { store.name = ""; })();
      expect(accessor()).toBe("");
    });

    it("boolean", () => {
      const store = observable({ active: true });

      let accessor: () => boolean;
      createRoot((d) => {
        accessor = obs(() => store.active);
        return d;
      });

      expect(accessor()).toBe(true);

      action(() => { store.active = false; })();
      expect(accessor()).toBe(false);

      action(() => { store.active = true; })();
      expect(accessor()).toBe(true);
    });

    it("null", () => {
      const store = observable<{ val: string | null }>({ val: null });

      let accessor: () => string | null;
      createRoot((d) => {
        accessor = obs(() => store.val);
        return d;
      });

      expect(accessor()).toBe(null);

      action(() => { store.val = "present"; })();
      expect(accessor()).toBe("present");

      action(() => { store.val = null; })();
      expect(accessor()).toBe(null);
    });

    it("undefined", () => {
      const store = observable<{ val: string | undefined }>({ val: undefined });

      let accessor: () => string | undefined;
      createRoot((d) => {
        accessor = obs(() => store.val);
        return d;
      });

      expect(accessor()).toBe(undefined);

      action(() => { store.val = "present"; })();
      expect(accessor()).toBe("present");

      action(() => { store.val = undefined; })();
      expect(accessor()).toBe(undefined);
    });

    it("object reference", () => {
      const obj = { id: 1, label: "a" };
      const store = observable({ item: obj });

      let accessor: () => { id: number; label: string };
      createRoot((d) => {
        accessor = obs(() => store.item);
        return d;
      });

      // MobX wraps plain objects in proxies — the reference is the observable proxy
      expect(accessor().id).toBe(1);
      expect(accessor().label).toBe("a");

      action(() => { store.item = { id: 2, label: "b" }; })();
      expect(accessor().id).toBe(2);
      expect(accessor().label).toBe("b");
    });

    it("equals: false re-notifies with same boolean value", () => {
      const store = observable({ flag: true, tick: 0 });
      const values: boolean[] = [];

      createRoot((d) => {
        const flag = obs(() => {
          void store.tick;
          return store.flag;
        });
        createEffect(() => { values.push(flag()); });
        return d;
      });

      expect(values).toEqual([true]);

      // Change tick but keep flag the same — signal re-notifies due to equals: false
      action(() => { store.tick = 1; })();
      expect(values).toEqual([true, true]);
    });

    it("equals: false re-notifies with same null value", () => {
      const store = observable<{ val: string | null; tick: number }>({ val: null, tick: 0 });
      const values: (string | null)[] = [];

      createRoot((d) => {
        const v = obs(() => {
          void store.tick;
          return store.val;
        });
        createEffect(() => { values.push(v()); });
        return d;
      });

      expect(values).toEqual([null]);

      action(() => { store.tick = 1; })();
      expect(values).toEqual([null, null]);
    });
  });

  describe("observable.box", () => {
    it("obs() tracks observable.box value via .get()", () => {
      const box = observable.box(42);

      let accessor: () => number;
      createRoot((d) => {
        accessor = obs(() => box.get());
        return d;
      });

      expect(accessor()).toBe(42);

      action(() => { box.set(99); })();
      expect(accessor()).toBe(99);
    });

    it("observable.box disposes autorun on Solid root disposal", () => {
      const box = observable.box("hello");
      const values: string[] = [];

      const dispose = createRoot((d) => {
        const accessor = obs(() => box.get());
        createEffect(() => { values.push(accessor()); });
        return d;
      });

      expect(values).toEqual(["hello"]);

      action(() => { box.set("world"); })();
      expect(values).toEqual(["hello", "world"]);

      dispose();

      action(() => { box.set("zombie"); })();
      expect(values).toEqual(["hello", "world"]);
    });
  });

  describe("observable.map", () => {
    it("obs() tracks ObservableMap.get()", () => {
      const map = observable.map<string, number>({ a: 1, b: 2 });

      let accessor: () => number | undefined;
      createRoot((d) => {
        accessor = obs(() => map.get("a"));
        return d;
      });

      expect(accessor()).toBe(1);

      action(() => { map.set("a", 10); })();
      expect(accessor()).toBe(10);
    });

    it("obs() tracks ObservableMap.has()", () => {
      const map = observable.map<string, number>({ x: 5 });

      let accessor: () => boolean;
      createRoot((d) => {
        accessor = obs(() => map.has("x"));
        return d;
      });

      expect(accessor()).toBe(true);

      action(() => { map.delete("x"); })();
      expect(accessor()).toBe(false);
    });

    it("obs() tracks ObservableMap.size", () => {
      const map = observable.map<string, number>({ a: 1 });

      let accessor: () => number;
      createRoot((d) => {
        accessor = obs(() => map.size);
        return d;
      });

      expect(accessor()).toBe(1);

      action(() => { map.set("b", 2); })();
      expect(accessor()).toBe(2);

      action(() => { map.delete("a"); })();
      expect(accessor()).toBe(1);
    });

    it("enableObservableTracking — createMemo tracks ObservableMap.get()", () => {
      const map = observable.map<string, number>({ count: 0 });
      let memo!: () => number | undefined;

      createRoot((d) => {
        memo = createMemo(() => map.get("count"));
        return d;
      });

      expect(memo()).toBe(0);

      action(() => { map.set("count", 7); })();
      expect(memo()).toBe(7);
    });

    it("enableObservableTracking — createEffect tracks ObservableMap.has()", () => {
      const map = observable.map<string, number>({ key: 1 });
      const results: boolean[] = [];

      createRoot((d) => {
        createEffect(() => { results.push(map.has("key")); });
        return d;
      });

      expect(results).toEqual([true]);

      action(() => { map.delete("key"); })();
      expect(results).toEqual([true, false]);

      action(() => { map.set("key", 99); })();
      expect(results).toEqual([true, false, true]);
    });
  });

  describe("observable.set", () => {
    it("obs() tracks ObservableSet.has()", () => {
      const set = observable.set<string>(["active"]);

      let accessor: () => boolean;
      createRoot((d) => {
        accessor = obs(() => set.has("active"));
        return d;
      });

      expect(accessor()).toBe(true);

      action(() => { set.delete("active"); })();
      expect(accessor()).toBe(false);

      action(() => { set.add("active"); })();
      expect(accessor()).toBe(true);
    });

    it("obs() tracks ObservableSet.size", () => {
      const set = observable.set<number>([1, 2]);

      let accessor: () => number;
      createRoot((d) => {
        accessor = obs(() => set.size);
        return d;
      });

      expect(accessor()).toBe(2);

      action(() => { set.add(3); })();
      expect(accessor()).toBe(3);

      action(() => { set.delete(1); })();
      expect(accessor()).toBe(2);
    });

    it("enableObservableTracking — createEffect tracks ObservableSet.has()", () => {
      const set = observable.set<string>(["ready"]);
      const results: boolean[] = [];

      createRoot((d) => {
        createEffect(() => { results.push(set.has("ready")); });
        return d;
      });

      expect(results).toEqual([true]);

      action(() => { set.delete("ready"); })();
      expect(results).toEqual([true, false]);
    });
  });
});


import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  observable,
  action,
  onBecomeObserved,
  onBecomeUnobserved,
} from "mobx";
import { createSignal, Show } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "./helpers";

/**
 * PITFALL: obs() through Solid props cannot retrack when the prop reference changes.
 *
 * obs() creates a MobX `autorun` that only tracks MobX observables.
 * Solid's reactive props (the `props` proxy) are tracked by Solid's
 * reactive system, NOT by MobX. When `props.store` changes from
 * observableA to observableB, the autorun does NOT re-run because
 * it doesn't track Solid's prop changes — it continues observing
 * observableA.name as a zombie.
 *
 * Developer guidance:
 * - For prop mutation tracking (same observable, property changes):
 *   obs(() => props.store.name) works correctly.
 * - For prop reference switching (different observable):
 *   Use <Show> or <Dynamic> to dispose/recreate the child component,
 *   so a fresh obs() is created with the new prop value.
 * - Alternatively, use EOT (direct JSX: `{props.store.name}`) which
 *   does track Solid prop changes via the EOT factory.
 */
describe("obs() with props — observable passed as prop", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  afterEach(() => {
    cleanup();
  });

  it("component receives MobX observable as prop — obs() tracks it correctly", () => {
    const store = observable({ name: "Alice" });

    const Child = (props: { store: { name: string } }) => {
      const name = obs(() => props.store.name);
      return <span data-testid="name">{name()}</span>;
    };

    const { getByTestId } = render(() => <Child store={store} />);
    expect(getByTestId("name").textContent).toBe("Alice");

    // Mutation propagates through props → obs()
    action(() => { store.name = "Bob"; })();
    expect(getByTestId("name").textContent).toBe("Bob");
  });

  it("obs() with props — cleanup on unmount releases observers", () => {
    const store = observable({ name: "Alice" });
    let observed = 0;
    let unobserved = 0;

    onBecomeObserved(store, "name", () => { observed++; });
    onBecomeUnobserved(store, "name", () => { unobserved++; });

    const Child = (props: { store: { name: string } }) => {
      const name = obs(() => props.store.name);
      return <span>{name()}</span>;
    };

    const { unmount } = render(() => <Child store={store} />);
    expect(observerCount(store, "name")).toBe(1);

    unmount();
    expect(observerCount(store, "name")).toBe(0);
    expect(unobserved).toBeGreaterThanOrEqual(1);
  });

  it("obs() with props — switching the prop via Show (disposes old, creates new)", () => {
    const storeA = observable({ name: "Alice" });
    const storeB = observable({ name: "Bob" });
    const [useA, setUseA] = createSignal(true);

    const Child = (props: { store: { name: string } }) => {
      const name = obs(() => props.store.name);
      return <span data-testid="name">{name()}</span>;
    };

    // Using Show to properly dispose/recreate the Child component
    // when switching between observables
    const Parent = () => (
      <Show when={useA()} fallback={<Child store={storeB} />}>
        <Child store={storeA} />
      </Show>
    );

    const { getByTestId } = render(() => <Parent />);
    expect(getByTestId("name").textContent).toBe("Alice");
    expect(observerCount(storeA, "name")).toBe(1);
    expect(observerCount(storeB, "name")).toBe(0);

    // Switch to storeB — Child with storeA is disposed, Child with storeB is created
    setUseA(false);
    expect(getByTestId("name").textContent).toBe("Bob");
    expect(observerCount(storeA, "name")).toBe(0);
    expect(observerCount(storeB, "name")).toBe(1);

    // Mutate storeB — propagates to new Child
    action(() => { storeB.name = "Charlie"; })();
    expect(getByTestId("name").textContent).toBe("Charlie");

    // Mutate storeA — no effect, it's no longer tracked
    action(() => { storeA.name = "Zombie"; })();
    expect(getByTestId("name").textContent).toBe("Charlie");
    expect(observerCount(storeA, "name")).toBe(0);

    // Switch back to storeA — new Child with storeA
    setUseA(true);
    expect(getByTestId("name").textContent).toBe("Zombie");
    expect(observerCount(storeA, "name")).toBe(1);
    expect(observerCount(storeB, "name")).toBe(0);
  });

  it("obs() with props — same observable prop, mutation tracking through obs()", () => {
    const store = observable({ x: 1, y: 2 });

    const Child = (props: { store: { x: number; y: number } }) => {
      const x = obs(() => props.store.x);
      const y = obs(() => props.store.y);
      return (
        <span data-testid="v">
          {x()}:{y()}
        </span>
      );
    };

    const { getByTestId } = render(() => <Child store={store} />);
    expect(getByTestId("v").textContent).toBe("1:2");

    // Mutate store properties — obs() tracks through props
    action(() => { store.x = 10; })();
    expect(getByTestId("v").textContent).toBe("10:2");

    action(() => { store.y = 20; })();
    expect(getByTestId("v").textContent).toBe("10:20");

    expect(observerCount(store, "x")).toBe(1);
    expect(observerCount(store, "y")).toBe(1);
  });

  it("obs() with props — multiple children sharing same observable prop", () => {
    const sharedStore = observable({ value: 1 });

    const Child = (props: { store: { value: number }; id: string }) => {
      const value = obs(() => props.store.value);
      return <span data-testid={props.id}>{value()}</span>;
    };

    const Parent = () => (
      <div>
        <Child store={sharedStore} id="c1" />
        <Child store={sharedStore} id="c2" />
      </div>
    );

    const { getByTestId, unmount } = render(() => <Parent />);
    expect(getByTestId("c1").textContent).toBe("1");
    expect(getByTestId("c2").textContent).toBe("1");
    expect(observerCount(sharedStore, "value")).toBe(2);

    // Mutation propagates to both children
    action(() => { sharedStore.value = 5; })();
    expect(getByTestId("c1").textContent).toBe("5");
    expect(getByTestId("c2").textContent).toBe("5");

    // Full cleanup on unmount
    unmount();
    expect(observerCount(sharedStore, "value")).toBe(0);
  });

  it("obs() with props — nested observable property through prop", () => {
    const store = observable({
      user: { profile: { name: "Alice", age: 30 } },
    });

    const Profile = (props: { user: { profile: { name: string; age: number } } }) => {
      const name = obs(() => props.user.profile.name);
      const age = obs(() => props.user.profile.age);
      return (
        <span data-testid="profile">
          {name()}:{age()}
        </span>
      );
    };

    const { getByTestId } = render(() => <Profile user={store.user} />);
    expect(getByTestId("profile").textContent).toBe("Alice:30");

    // Mutate deeply nested property via prop
    action(() => { store.user.profile.name = "Bob"; })();
    expect(getByTestId("profile").textContent).toBe("Bob:30");

    action(() => { store.user.profile.age = 35; })();
    expect(getByTestId("profile").textContent).toBe("Bob:35");
  });

  it("obs() with props + EOT JSX — double bridge through prop", () => {
    const store = observable({ x: 1, y: 2 });

    const Child = (props: { store: { x: number; y: number } }) => {
      const x = obs(() => props.store.x);
      return (
        <span data-testid="v">
          {x()}:{props.store.y}
        </span>
      );
    };

    const { getByTestId } = render(() => <Child store={store} />);
    expect(getByTestId("v").textContent).toBe("1:2");
    expect(observerCount(store, "x")).toBe(1);
    expect(observerCount(store, "y")).toBeGreaterThan(0);

    // Mutate both — both bridges propagate
    action(() => { store.x = 10; })();
    expect(getByTestId("v").textContent).toBe("10:2");

    action(() => { store.y = 20; })();
    expect(getByTestId("v").textContent).toBe("10:20");
  });

  it("obs() with props — prop reference stays same object, mutation via action on items", () => {
    const store = observable({ items: [1, 2, 3], count: 0 });

    const Child = (props: { store: { items: number[]; count: number } }) => {
      // Use obs() for the array length directly to avoid potential issues
      // with accessing MobX observable array properties through the obs() signal
      const itemCount = obs(() => props.store.items.length);
      const count = obs(() => props.store.count);
      return (
        <span data-testid="v">
          {itemCount()}:{count()}
        </span>
      );
    };

    const { getByTestId } = render(() => <Child store={store} />);
    expect(getByTestId("v").textContent).toBe("3:0");

    // Mutate items array (same object reference)
    action(() => { store.items.push(4); })();
    expect(getByTestId("v").textContent).toBe("4:0");

    // Mutate count
    action(() => { store.count = 5; })();
    expect(getByTestId("v").textContent).toBe("4:5");

    // Splice items
    action(() => { store.items.splice(1, 2); })();
    expect(getByTestId("v").textContent).toBe("2:5");
  });

  it("obs() with props — direct prop read (same store) vs obs() through prop, both clean up", () => {
    const store = observable({ value: 10 });

    const Child = (props: { store: { value: number } }) => {
      const obsValue = obs(() => props.store.value);
      return (
        <span data-testid="v">
          {obsValue()}:{props.store.value}
        </span>
      );
    };

    const { unmount, getByTestId } = render(() => <Child store={store} />);
    expect(getByTestId("v").textContent).toBe("10:10");

    // Both bridges propagate updates
    action(() => { store.value = 20; })();
    expect(getByTestId("v").textContent).toBe("20:20");

    // obs() creates 1 observer, EOT JSX creates ≥1 observer
    expect(observerCount(store, "value")).toBeGreaterThan(1);

    // Full cleanup
    unmount();
    expect(observerCount(store, "value")).toBe(0);
  });
});

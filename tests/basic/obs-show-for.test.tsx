import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  observable,
  action,
  onBecomeObserved,
  onBecomeUnobserved,
} from "mobx";
import { Show, For, createSignal } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";
import { observerCount } from "./helpers";

describe("obs() inside Solid <Show> and <For>", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  afterEach(() => {
    cleanup();
  });

  describe("<Show when={obs(...)}>", () => {
    it("Show toggles when obs() accessor value changes", () => {
      const store = observable({ visible: true, label: "Hello" });

      const View = () => {
        const visible = obs(() => store.visible);
        const label = obs(() => store.label);
        return (
          <Show when={visible()}>
            <span data-testid="label">{label()}</span>
          </Show>
        );
      };

      const { getByTestId, queryByTestId } = render(() => <View />);
      expect(getByTestId("label").textContent).toBe("Hello");

      // Toggle visibility off via MobX mutation
      action(() => { store.visible = false; })();
      expect(queryByTestId("label")).toBeNull();

      // Toggle visibility back on
      action(() => { store.visible = true; })();
      expect(getByTestId("label").textContent).toBe("Hello");
    });

    it("Show when={obs()} — obs() inside Show content is disposed on hide, recreated on show", () => {
      const store = observable({ count: 0 });
      const [manualVisible, setManualVisible] = createSignal(true);
      let observed = 0;
      let unobserved = 0;

      onBecomeObserved(store, "count", () => { observed++; });
      onBecomeUnobserved(store, "count", () => { unobserved++; });

      // obs() is inside the Show content (child component), not in the parent scope.
      // When Show hides, the child component is disposed → obs() autorun is disposed.
      const Counter = () => {
        const count = obs(() => store.count);
        return <span data-testid="v">{count()}</span>;
      };

      const View = () => (
        <Show when={manualVisible()}>
          <Counter />
        </Show>
      );

      render(() => <View />);

      expect(observerCount(store, "count")).toBe(1);

      // Toggle Show off — Counter is disposed, its obs() autorun disposed
      setManualVisible(false);
      expect(observerCount(store, "count")).toBe(0);
      expect(unobserved).toBeGreaterThanOrEqual(1);

      // Toggle Show back on — Counter re-created, new obs() autorun
      setManualVisible(true);
      expect(observerCount(store, "count")).toBe(1);

      // Toggle off again — cleanup again
      setManualVisible(false);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("Show when={obs()} — obs() in parent scope survives Show toggle, disposes on View unmount", () => {
      const store = observable({ visible: true, count: 0 });
      const [manualVisible, setManualVisible] = createSignal(true);

      const Counter = () => {
        const count = obs(() => store.count);
        return <span data-testid="v">{count()}</span>;
      };

      // obs() for visible is in View (parent) scope — persists across Show toggle
      const View = () => {
        const visible = obs(() => store.visible);
        return (
          <Show when={manualVisible() && visible()}>
            <Counter />
          </Show>
        );
      };

      const { unmount } = render(() => <View />);

      // Parent-level obs() for visible + Counter-level obs() for count
      expect(observerCount(store, "visible")).toBe(1);
      expect(observerCount(store, "count")).toBe(1);

      // Toggle Show off via Solid signal — only Counter-level obs() disposed
      setManualVisible(false);
      expect(observerCount(store, "visible")).toBe(1); // parent's obs() survives
      expect(observerCount(store, "count")).toBe(0);   // inside Show → disposed

      // Toggle Show back on
      setManualVisible(true);
      expect(observerCount(store, "visible")).toBe(1);
      expect(observerCount(store, "count")).toBe(1);

      // Unmount View — all obs() disposed including parent-level
      unmount();
      expect(observerCount(store, "visible")).toBe(0);
      expect(observerCount(store, "count")).toBe(0);
    });

    it("Show when={obs()} with nested obs() — child obs() cleaned up, parent obs() persists", () => {
      const store = observable({
        show: true,
        user: { name: "Alice", age: 30 },
      });
      const [toggle, setToggle] = createSignal(true);

      const Nested = () => {
        const name = obs(() => store.user.name);
        const age = obs(() => store.user.age);
        return (
          <span data-testid="user">
            {name()}:{age()}
          </span>
        );
      };

      const View = () => {
        const show = obs(() => store.show);
        return (
          <Show when={toggle() && show()}>
            <Nested />
          </Show>
        );
      };

      const { unmount } = render(() => <View />);

      expect(observerCount(store, "show")).toBe(1); // parent-level
      expect(observerCount(store.user, "name")).toBe(1); // inside Show
      expect(observerCount(store.user, "age")).toBe(1); // inside Show

      // Hide via Solid signal — Nested's obs() disposed, View's obs() for show persists
      setToggle(false);
      expect(observerCount(store, "show")).toBe(1); // parent-level survives
      expect(observerCount(store.user, "name")).toBe(0); // inside Show → disposed
      expect(observerCount(store.user, "age")).toBe(0); // inside Show → disposed

      // Show again — Nested re-creates its obs()
      setToggle(true);
      expect(observerCount(store, "show")).toBe(1);
      expect(observerCount(store.user, "name")).toBe(1);
      expect(observerCount(store.user, "age")).toBe(1);

      // Full cleanup on View unmount
      unmount();
      expect(observerCount(store, "show")).toBe(0);
      expect(observerCount(store.user, "name")).toBe(0);
      expect(observerCount(store.user, "age")).toBe(0);
    });

    it("Show when={obs()} — show condition itself is reactive via obs()", () => {
      const store = observable({ visible: true, content: "visible content" });

      const View = () => {
        const visible = obs(() => store.visible);
        return (
          <Show when={visible()} fallback={<span data-testid="fallback">hidden</span>}>
            <span data-testid="content">{store.content}</span>
          </Show>
        );
      };

      const { getByTestId, queryByTestId } = render(() => <View />);
      expect(getByTestId("content").textContent).toBe("visible content");

      // Change observable that drives Show condition
      action(() => { store.visible = false; })();
      expect(queryByTestId("content")).toBeNull();
      expect(getByTestId("fallback").textContent).toBe("hidden");

      // Change observable content while hidden — should not appear
      action(() => { store.content = "stale content"; })();
      expect(getByTestId("fallback").textContent).toBe("hidden");

      // Show again — content reflects latest state
      action(() => { store.visible = true; })();
      expect(getByTestId("content").textContent).toBe("stale content");
    });
  });

  describe("<For each={obs(...)}>", () => {
    it("For renders list from obs() accessor and updates on mutation", () => {
      const store = observable({
        items: [
          { id: 1, label: "A" },
          { id: 2, label: "B" },
          { id: 3, label: "C" },
        ],
      });

      const Item = (props: { item: { id: number; label: string } }) => (
        <li data-testid={`item-${props.item.id}`}>{props.item.label}</li>
      );

      const List = () => {
        const items = obs(() => store.items);
        return (
          <ul>
            <For each={items()}>
              {(item) => <Item item={item} />}
            </For>
          </ul>
        );
      };

      const { getByTestId, queryByTestId } = render(() => <List />);
      expect(getByTestId("item-1").textContent).toBe("A");
      expect(getByTestId("item-2").textContent).toBe("B");
      expect(getByTestId("item-3").textContent).toBe("C");

      // Remove an item
      action(() => { store.items.splice(1, 1); })();
      expect(queryByTestId("item-2")).toBeNull();
      expect(getByTestId("item-1").textContent).toBe("A");
      expect(getByTestId("item-3").textContent).toBe("C");

      // Add an item
      action(() => { store.items.push({ id: 4, label: "D" }); })();
      expect(getByTestId("item-4").textContent).toBe("D");
    });

    it("For each={obs()} — cleanup when items are removed", () => {
      const store = observable({
        items: [
          { id: 1, value: 10 },
          { id: 2, value: 20 },
          { id: 3, value: 30 },
        ],
      });

      let observed = 0;
      let unobserved = 0;
      onBecomeObserved(store, "items", () => { observed++; });
      onBecomeUnobserved(store, "items", () => { unobserved++; });

      const Item = (props: { item: { id: number; value: number } }) => {
        const value = obs(() => props.item.value);
        return <li data-testid={`val-${props.item.id}`}>{value()}</li>;
      };

      const List = () => {
        const items = obs(() => store.items);
        return (
          <ul data-testid="list">
            <For each={items()}>
              {(item) => <Item item={item} />}
            </For>
          </ul>
        );
      };

      const { unmount } = render(() => <List />);

      // obs() for items array + obs() for each item's value
      expect(observerCount(store, "items")).toBe(1);
      expect(observerCount(store.items[0], "value")).toBe(1);
      expect(observerCount(store.items[1], "value")).toBe(1);
      expect(observerCount(store.items[2], "value")).toBe(1);

      // Remove middle item — its obs() autorun is disposed by For's cleanup
      const removedItem = store.items[1];
      action(() => { store.items.splice(1, 1); })();
      // Removed item no longer observed
      expect(observerCount(removedItem, "value")).toBe(0);
      // Remaining items still observed
      expect(observerCount(store.items[0], "value")).toBe(1);
      expect(observerCount(store.items[1], "value")).toBe(1);

      // Unmount the entire list — all autoruns disposed
      unmount();
      expect(observerCount(store, "items")).toBe(0);
    });

    it("For each={obs()} — item-level obs() updates independently", () => {
      const store = observable({
        items: [
          { id: 1, count: 0 },
          { id: 2, count: 0 },
        ],
      });

      const Item = (props: { item: { id: number; count: number } }) => {
        const count = obs(() => props.item.count);
        return <span data-testid={`cnt-${props.item.id}`}>{count()}</span>;
      };

      const List = () => {
        const items = obs(() => store.items);
        return (
          <div>
            <For each={items()}>
              {(item) => <Item item={item} />}
            </For>
          </div>
        );
      };

      const { getByTestId } = render(() => <List />);
      expect(getByTestId("cnt-1").textContent).toBe("0");
      expect(getByTestId("cnt-2").textContent).toBe("0");

      // Update only one item's count
      action(() => { store.items[0].count = 5; })();
      expect(getByTestId("cnt-1").textContent).toBe("5");
      expect(getByTestId("cnt-2").textContent).toBe("0");

      // Update the other item
      action(() => { store.items[1].count = 10; })();
      expect(getByTestId("cnt-1").textContent).toBe("5");
      expect(getByTestId("cnt-2").textContent).toBe("10");
    });

    it("For each={obs()} + Show when={obs()} — child obs() disposed on Show hide", () => {
      const store = observable({
        visible: true,
        items: [
          { id: 1, label: "A" },
          { id: 2, label: "B" },
        ],
      });
      const [toggle, setToggle] = createSignal(true);

      const Item = (props: { item: { id: number; label: string } }) => {
        const label = obs(() => props.item.label);
        return <li data-testid={`lbl-${props.item.id}`}>{label()}</li>;
      };

      const List = () => {
        const items = obs(() => store.items);
        return (
          <ul>
            <For each={items()}>
              {(item) => <Item item={item} />}
            </For>
          </ul>
        );
      };

      const View = () => {
        const visible = obs(() => store.visible);
        return (
          <Show when={toggle() && visible()}>
            <List />
          </Show>
        );
      };

      const { unmount } = render(() => <View />);

      // Parent: obs() for visible (1). List: obs() for items (1). Items: obs() for label (2)
      expect(observerCount(store, "visible")).toBe(1);
      expect(observerCount(store, "items")).toBe(1);
      expect(observerCount(store.items[0], "label")).toBe(1);
      expect(observerCount(store.items[1], "label")).toBe(1);

      // Hide via Show toggle — List and Items disposed, View's obs() for visible persists
      setToggle(false);
      expect(observerCount(store, "visible")).toBe(1); // parent persists
      expect(observerCount(store, "items")).toBe(0); // inside Show → disposed
      expect(observerCount(store.items[0], "label")).toBe(0);
      expect(observerCount(store.items[1], "label")).toBe(0);

      // Show again — everything re-created inside Show
      setToggle(true);
      expect(observerCount(store, "visible")).toBe(1);
      expect(observerCount(store, "items")).toBe(1);
      expect(observerCount(store.items[0], "label")).toBe(1);
      expect(observerCount(store.items[1], "label")).toBe(1);

      // Full cleanup on View unmount
      unmount();
      expect(observerCount(store, "visible")).toBe(0);
      expect(observerCount(store, "items")).toBe(0);
    });

    it("For each={obs()} with Show fallback — list content disposes, fallback shows", () => {
      const store = observable({
        items: [{ id: 1, label: "X" }],
        showList: true,
      });

      const Item = (props: { item: { id: number; label: string } }) => {
        const label = obs(() => props.item.label);
        return <li data-testid={`lbl-${props.item.id}`}>{label()}</li>;
      };

      // ListContent is a separate component inside Show —
      // its obs() for items is disposed when Show hides
      const ListContent = () => {
        const items = obs(() => store.items);
        return (
          <ul>
            <For each={items()}>
              {(item) => <Item item={item} />}
            </For>
          </ul>
        );
      };

      const View = () => {
        const showList = obs(() => store.showList);
        return (
          <Show when={showList()} fallback={<span data-testid="empty">No items</span>}>
            <ListContent />
          </Show>
        );
      };

      const { getByTestId, queryByTestId, unmount } = render(() => <View />);

      expect(getByTestId("lbl-1").textContent).toBe("X");
      expect(observerCount(store, "showList")).toBe(1);
      expect(observerCount(store, "items")).toBe(1);

      // Toggle Show off via MobX mutation
      // Parent-level obs() for showList persists.
      // ListContent (inside Show) is disposed → its obs() for items + Item obs() for label disposed
      action(() => { store.showList = false; })();
      expect(queryByTestId("lbl-1")).toBeNull();
      expect(getByTestId("empty").textContent).toBe("No items");
      expect(observerCount(store, "showList")).toBe(1); // parent persists
      expect(observerCount(store, "items")).toBe(0);    // inside Show → disposed

      // Toggle back on
      action(() => { store.showList = true; })();
      expect(getByTestId("lbl-1").textContent).toBe("X");
      expect(observerCount(store, "items")).toBe(1);

      unmount();
      expect(observerCount(store, "showList")).toBe(0);
      expect(observerCount(store, "items")).toBe(0);
    });
  });
});

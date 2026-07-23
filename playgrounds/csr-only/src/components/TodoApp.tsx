import { For, Show } from "solid-js";
import type { Filter } from "../store/todo-list-vm";
import { todoListVM } from "../store/todo-list-vm";
import { TodoItem } from "./TodoItem";
import { StatsBar } from "./StatsBar";
import { ThemeToggle } from "./ThemeToggle";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "completed", label: "Completed" },
];

export function TodoApp() {
  const vm = todoListVM;

  return (
    <div class="app">
      <header class="hero">
        <div class="hero-top">
          <p class="brand">mobx-solid</p>
          <ThemeToggle />
        </div>
        <h1>Playground</h1>
        <p class="lede">
          SolidJS UI driven by a MobX MVVM store — via{" "}
          <code>enableObservableTracking</code>.
        </p>
      </header>

      <StatsBar vm={vm} />

      <section class="panel">
        <form
          class="add-form"
          onSubmit={(e) => {
            e.preventDefault();
            vm.addTodo();
          }}
        >
          <input
            class="add-input"
            placeholder="What needs doing?"
            value={vm.newTitle}
            onInput={(e) => vm.setNewTitle(e.currentTarget.value)}
          />
          <button type="submit" class="btn primary" disabled={!vm.newTitle.trim()}>
            Add
          </button>
        </form>

        <div class="toolbar">
          <label class="check toggle-all">
            <input
              type="checkbox"
              checked={vm.allCompleted}
              disabled={vm.totalCount === 0}
              onChange={() => vm.toggleAll()}
            />
            <span>Toggle all</span>
          </label>

          <div class="filters">
            <For each={FILTERS}>
              {(f) => (
                <button
                  type="button"
                  class="chip"
                  classList={{ active: vm.filterVM.filter === f.id }}
                  onClick={() => {
                    vm.filterVM.setFilter(f.id);
                    vm.paginationVM.setPage(1);
                  }}
                >
                  {f.label}
                </button>
              )}
            </For>
          </div>

          <button
            type="button"
            class="btn ghost"
            disabled={vm.completedCount === 0}
            onClick={() => vm.clearCompleted()}
          >
            Clear done
          </button>
        </div>

        <Show
          when={vm.paginatedTodos.length > 0}
          fallback={<p class="empty">Nothing here. Add a todo or change the filter.</p>}
        >
          <ul class="todo-list">
            <For each={vm.paginatedTodos}>{(todo) => <TodoItem todo={todo} vm={vm} />}</For>
          </ul>
        </Show>

        <footer class="footer">
          <div class="pager">
            <button
              type="button"
              class="btn ghost"
              disabled={!vm.canGoPrev}
              onClick={() => vm.paginationVM.prevPage()}
            >
              Prev
            </button>
            <span class="page mono">
              {vm.paginationVM.page} / {vm.totalPages}
            </span>
            <button
              type="button"
              class="btn ghost"
              disabled={!vm.canGoNext}
              onClick={() => vm.paginationVM.nextPage()}
            >
              Next
            </button>
          </div>

          <div class="sync">
            <Show when={vm.syncVM.error}>
              <span class="error">{vm.syncVM.error}</span>
            </Show>
            <button
              type="button"
              class="btn primary"
              disabled={vm.syncVM.loading}
              onClick={() => void vm.sync()}
            >
              {vm.syncVM.loading ? "Syncing…" : "Sync"}
            </button>
          </div>
        </footer>
      </section>

      <aside class="api-notes">
        <h2>Bindings in use</h2>
        <ul>
          <li>
            <code>enableObservableTracking()</code> — once in <code>main.tsx</code>
          </li>
          <li>
            JSX reads MobX directly — TodoApp, TodoItem, StatsBar, ThemeToggle
          </li>
        </ul>
      </aside>
    </div>
  );
}

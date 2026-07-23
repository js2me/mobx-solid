import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  observable,
  action,
  computed,
  makeAutoObservable,
  makeObservable,
  observable as obs,
  runInAction,
} from "mobx";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../../src/enable-observable-tracking";

let bindingInitialized = false;
function ensureBinding() {
  if (!bindingInitialized) {
    enableObservableTracking();
    bindingInitialized = true;
  }
}

// ─────────────────────────────────────────────────────────────
// Domain models (pure data, no VM logic)
// ─────────────────────────────────────────────────────────────

let nextTodoId = 1;

interface TodoData {
  id: string;
  title: string;
  done: boolean;
}

class Todo {
  id: string;
  title: string;
  done = false;

  constructor(data: TodoData) {
    this.id = data.id;
    this.title = data.title;
    this.done = data.done;
    makeAutoObservable(this);
  }

  toggle() {
    this.done = !this.done;
  }

  setTitle(title: string) {
    this.title = title;
  }
}

// ─────────────────────────────────────────────────────────────
// Composed sub-ViewModels (composition pattern)
// ─────────────────────────────────────────────────────────────

/** Manages filter state for the todo list */
class TodoFilterVM {
  filter: "all" | "active" | "completed" = "all";

  constructor() {
    makeAutoObservable(this);
  }

  setFilter(filter: "all" | "active" | "completed") {
    this.filter = filter;
  }

  get isActive() {
    return this.filter === "active";
  }

  get isCompleted() {
    return this.filter === "completed";
  }

  get isAll() {
    return this.filter === "all";
  }
}

/** Manages async operations state */
class AsyncOperationVM {
  loading = false;
  error: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  start() {
    this.loading = true;
    this.error = null;
  }

  succeed() {
    this.loading = false;
    this.error = null;
  }

  fail(message: string) {
    this.loading = false;
    this.error = message;
  }

  reset() {
    this.loading = false;
    this.error = null;
  }
}

/** Manages pagination state */
class PaginationVM {
  page = 1;
  pageSize = 5;

  constructor() {
    makeAutoObservable(this);
  }

  setPage(page: number) {
    this.page = page;
  }

  nextPage() {
    this.page++;
  }

  prevPage() {
    if (this.page > 1) this.page--;
  }

  get offset() {
    return (this.page - 1) * this.pageSize;
  }
}

// ─────────────────────────────────────────────────────────────
// Main ViewModel — composes sub-VMs
// ─────────────────────────────────────────────────────────────

class TodoListVM {
  todos: Todo[] = [];
  filterVM: TodoFilterVM;
  syncVM: AsyncOperationVM;
  paginationVM: PaginationVM;
  editingId: string | null = null;
  draftTitle = "";

  constructor() {
    this.filterVM = new TodoFilterVM();
    this.syncVM = new AsyncOperationVM();
    this.paginationVM = new PaginationVM();
    makeAutoObservable(this, {
      filterVM: obs.ref,
      syncVM: obs.ref,
      paginationVM: obs.ref,
    });
  }

  // ── Actions ──

  addTodo(title: string) {
    if (!title.trim()) return;
    this.todos.push(new Todo({ id: String(nextTodoId++), title: title.trim(), done: false }));
  }

  removeTodo(id: string) {
    this.todos = this.todos.filter((t) => t.id !== id);
  }

  startEditing(id: string) {
    const todo = this.todos.find((t) => t.id === id);
    if (todo) {
      this.editingId = id;
      this.draftTitle = todo.title;
    }
  }

  saveEdit() {
    if (this.editingId && this.draftTitle.trim()) {
      const todo = this.todos.find((t) => t.id === this.editingId);
      if (todo) {
        todo.setTitle(this.draftTitle.trim());
      }
    }
    this.editingId = null;
    this.draftTitle = "";
  }

  cancelEdit() {
    this.editingId = null;
    this.draftTitle = "";
  }

  setDraftTitle(title: string) {
    this.draftTitle = title;
  }

  clearCompleted() {
    this.todos = this.todos.filter((t) => !t.done);
  }

  toggleAll() {
    const allDone = this.todos.every((t) => t.done);
    for (const todo of this.todos) {
      todo.done = !allDone;
    }
  }

  // ── Computed ──

  get filteredTodos(): Todo[] {
    switch (this.filterVM.filter) {
      case "active":
        return this.todos.filter((t) => !t.done);
      case "completed":
        return this.todos.filter((t) => t.done);
      default:
        return this.todos;
    }
  }

  get paginatedTodos(): Todo[] {
    const { offset, pageSize } = this.paginationVM;
    return this.filteredTodos.slice(offset, offset + pageSize);
  }

  get totalCount() {
    return this.todos.length;
  }

  get activeCount() {
    return this.todos.filter((t) => !t.done).length;
  }

  get completedCount() {
    return this.todos.filter((t) => t.done).length;
  }

  get hasTodos() {
    return this.todos.length > 0;
  }

  get allCompleted() {
    return this.todos.length > 0 && this.todos.every((t) => t.done);
  }

  get isEditing() {
    return this.editingId !== null;
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredTodos.length / this.paginationVM.pageSize));
  }

  get canGoPrev(): boolean {
    return this.paginationVM.page > 1;
  }

  get canGoNext(): boolean {
    return this.paginationVM.page < this.totalPages;
  }
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("MVVM scenario — TodoListVM with SolidJS components", () => {
  beforeEach(() => {
    ensureBinding();
  });

  afterEach(() => {
    cleanup();
  });

  // ── VM logic tests (no DOM) ──

  describe("TodoListVM — business logic", () => {
    it("adds and removes todos", () => {
      const vm = new TodoListVM();
      expect(vm.totalCount).toBe(0);

      vm.addTodo("Buy milk");
      vm.addTodo("Walk dog");
      expect(vm.totalCount).toBe(2);

      vm.removeTodo(vm.todos[0].id);
      expect(vm.totalCount).toBe(1);
      expect(vm.todos[0].title).toBe("Walk dog");
    });

    it("computes active and completed counts", () => {
      const vm = new TodoListVM();
      vm.addTodo("A");
      vm.addTodo("B");
      vm.addTodo("C");

      expect(vm.activeCount).toBe(3);
      expect(vm.completedCount).toBe(0);

      vm.todos[0].toggle();
      expect(vm.activeCount).toBe(2);
      expect(vm.completedCount).toBe(1);
    });

    it("filters todos by status via composed filterVM", () => {
      const vm = new TodoListVM();
      vm.addTodo("A");
      vm.addTodo("B");
      vm.todos[0].toggle();

      vm.filterVM.setFilter("active");
      expect(vm.filteredTodos.length).toBe(1);
      expect(vm.filteredTodos[0].title).toBe("B");

      vm.filterVM.setFilter("completed");
      expect(vm.filteredTodos.length).toBe(1);
      expect(vm.filteredTodos[0].title).toBe("A");

      vm.filterVM.setFilter("all");
      expect(vm.filteredTodos.length).toBe(2);
    });

    it("paginates todos via composed paginationVM", () => {
      const vm = new TodoListVM();
      for (let i = 1; i <= 12; i++) {
        vm.addTodo(`Item ${i}`);
      }

      expect(vm.paginatedTodos.length).toBe(5);
      expect(vm.paginatedTodos[0].title).toBe("Item 1");

      vm.paginationVM.nextPage();
      expect(vm.paginatedTodos[0].title).toBe("Item 6");

      vm.paginationVM.nextPage();
      expect(vm.paginatedTodos.length).toBe(2);
      expect(vm.paginatedTodos[0].title).toBe("Item 11");
    });

    it("toggles all todos", () => {
      const vm = new TodoListVM();
      vm.addTodo("A");
      vm.addTodo("B");

      expect(vm.allCompleted).toBe(false);

      vm.toggleAll();
      expect(vm.allCompleted).toBe(true);
      expect(vm.activeCount).toBe(0);

      vm.toggleAll();
      expect(vm.allCompleted).toBe(false);
      expect(vm.activeCount).toBe(2);
    });

    it("clears completed todos", () => {
      const vm = new TodoListVM();
      vm.addTodo("A");
      vm.addTodo("B");
      vm.todos[0].toggle();

      vm.clearCompleted();
      expect(vm.totalCount).toBe(1);
      expect(vm.todos[0].title).toBe("B");
    });

    it("edits a todo", () => {
      const vm = new TodoListVM();
      vm.addTodo("Original");

      vm.startEditing(vm.todos[0].id);
      expect(vm.isEditing).toBe(true);
      expect(vm.draftTitle).toBe("Original");

      vm.setDraftTitle("Updated");
      vm.saveEdit();
      expect(vm.isEditing).toBe(false);
      expect(vm.todos[0].title).toBe("Updated");
    });

    it("cancels editing", () => {
      const vm = new TodoListVM();
      vm.addTodo("Original");

      vm.startEditing(vm.todos[0].id);
      vm.setDraftTitle("Changed");
      vm.cancelEdit();
      expect(vm.isEditing).toBe(false);
      expect(vm.todos[0].title).toBe("Original");
    });

    it("tracks async state via composed syncVM", () => {
      const vm = new TodoListVM();
      expect(vm.syncVM.loading).toBe(false);
      expect(vm.syncVM.error).toBeNull();

      vm.syncVM.start();
      expect(vm.syncVM.loading).toBe(true);

      vm.syncVM.succeed();
      expect(vm.syncVM.loading).toBe(false);

      vm.syncVM.start();
      vm.syncVM.fail("Network error");
      expect(vm.syncVM.loading).toBe(false);
      expect(vm.syncVM.error).toBe("Network error");

      vm.syncVM.reset();
      expect(vm.syncVM.error).toBeNull();
    });

    it("pagination respects filter", () => {
      const vm = new TodoListVM();
      for (let i = 1; i <= 8; i++) {
        vm.addTodo(`Item ${i}`);
      }
      // Complete first 4
      vm.todos[0].toggle();
      vm.todos[1].toggle();
      vm.todos[2].toggle();
      vm.todos[3].toggle();

      vm.filterVM.setFilter("active");
      expect(vm.filteredTodos.length).toBe(4);
      expect(vm.paginatedTodos.length).toBe(4);

      vm.paginationVM.nextPage();
      expect(vm.paginatedTodos.length).toBe(0); // only 4 active, page 2 is empty
    });
  });

  // ── SolidJS component rendering tests ──

  describe("TodoListVM — SolidJS component integration", () => {
    it("renders the todo list from VM", async () => {
      const vm = new TodoListVM();
      vm.addTodo("Buy milk");
      vm.addTodo("Walk dog");

      const TodoListView = () => (
        <ul data-testid="todo-list">
          {vm.paginatedTodos.map((todo) => (
            <li data-testid={`todo-${todo.id}`}>
              <span data-testid={`title-${todo.id}`}>{todo.title}</span>
              <span data-testid={`status-${todo.id}`}>{todo.done ? "✓" : "○"}</span>
            </li>
          ))}
        </ul>
      );

      const { getByTestId } = render(() => <TodoListView />);
      expect(getByTestId("todo-list").children.length).toBe(2);
      expect(getByTestId("title-" + vm.todos[0].id).textContent).toBe("Buy milk");
      expect(getByTestId("status-" + vm.todos[0].id).textContent).toBe("○");
    });

    it("reactively updates when a todo is toggled", async () => {
      const vm = new TodoListVM();
      vm.addTodo("Buy milk");

      const TodoListView = () => (
        <div>
          <span data-testid="active-count">{vm.activeCount}</span>
          <span data-testid="completed-count">{vm.completedCount}</span>
          <span data-testid="status">{vm.todos[0].done ? "done" : "pending"}</span>
        </div>
      );

      const { getByTestId } = render(() => <TodoListView />);
      expect(getByTestId("active-count").textContent).toBe("1");
      expect(getByTestId("completed-count").textContent).toBe("0");
      expect(getByTestId("status").textContent).toBe("pending");

      action(() => vm.todos[0].toggle())();
      expect(getByTestId("active-count").textContent).toBe("0");
      expect(getByTestId("completed-count").textContent).toBe("1");
      expect(getByTestId("status").textContent).toBe("done");
    });

    it("reactively updates when a todo is added via action", async () => {
      const vm = new TodoListVM();

      const TodoListView = () => (
        <div>
          <span data-testid="total">{vm.totalCount}</span>
          <ul data-testid="list">
            {vm.todos.map((todo) => (
              <li key={todo.id}>{todo.title}</li>
            ))}
          </ul>
        </div>
      );

      const { getByTestId } = render(() => <TodoListView />);
      expect(getByTestId("total").textContent).toBe("0");

      action(() => vm.addTodo("First"))();
      expect(getByTestId("total").textContent).toBe("1");
      expect(getByTestId("list").children.length).toBe(1);

      action(() => vm.addTodo("Second"))();
      expect(getByTestId("total").textContent).toBe("2");
      expect(getByTestId("list").children.length).toBe(2);
    });

    it("reactively updates when filter changes via composed filterVM", async () => {
      const vm = new TodoListVM();
      vm.addTodo("Active todo");
      vm.addTodo("Completed todo");
      action(() => vm.todos[1].toggle())();

      const FilteredView = () => (
        <div>
          <span data-testid="filter">{vm.filterVM.filter}</span>
          <ul data-testid="filtered-list">
            {vm.filteredTodos.map((todo) => (
              <li key={todo.id}>{todo.title}</li>
            ))}
          </ul>
        </div>
      );

      const { getByTestId } = render(() => <FilteredView />);
      expect(getByTestId("filter").textContent).toBe("all");
      expect(getByTestId("filtered-list").children.length).toBe(2);

      action(() => vm.filterVM.setFilter("active"))();
      expect(getByTestId("filter").textContent).toBe("active");
      expect(getByTestId("filtered-list").children.length).toBe(1);
      expect(getByTestId("filtered-list").children[0].textContent).toBe("Active todo");

      action(() => vm.filterVM.setFilter("completed"))();
      expect(getByTestId("filtered-list").children.length).toBe(1);
      expect(getByTestId("filtered-list").children[0].textContent).toBe("Completed todo");
    });

    it("reactively updates pagination via composed paginationVM", async () => {
      const vm = new TodoListVM();
      for (let i = 1; i <= 7; i++) {
        vm.addTodo(`Item ${i}`);
      }

      const PaginatedView = () => (
        <div>
          <span data-testid="page">{vm.paginationVM.page}</span>
          <span data-testid="total-pages">{vm.totalPages}</span>
          <ul data-testid="page-items">
            {vm.paginatedTodos.map((todo) => (
              <li key={todo.id}>{todo.title}</li>
            ))}
          </ul>
          <span data-testid="can-prev">{vm.canGoPrev ? "yes" : "no"}</span>
          <span data-testid="can-next">{vm.canGoNext ? "yes" : "no"}</span>
        </div>
      );

      const { getByTestId } = render(() => <PaginatedView />);
      expect(getByTestId("page").textContent).toBe("1");
      expect(getByTestId("total-pages").textContent).toBe("2");
      expect(getByTestId("page-items").children.length).toBe(5);
      expect(getByTestId("can-prev").textContent).toBe("no");
      expect(getByTestId("can-next").textContent).toBe("yes");

      action(() => vm.paginationVM.nextPage())();
      expect(getByTestId("page").textContent).toBe("2");
      expect(getByTestId("page-items").children.length).toBe(2);
      expect(getByTestId("can-prev").textContent).toBe("yes");
      expect(getByTestId("can-next").textContent).toBe("no");
    });

    it("reactively updates loading/error state via composed syncVM", async () => {
      const vm = new TodoListVM();

      const SyncView = () => (
        <div>
          <span data-testid="loading">{vm.syncVM.loading ? "loading" : "idle"}</span>
          <span data-testid="error">{vm.syncVM.error ?? "none"}</span>
        </div>
      );

      const { getByTestId } = render(() => <SyncView />);
      expect(getByTestId("loading").textContent).toBe("idle");
      expect(getByTestId("error").textContent).toBe("none");

      action(() => vm.syncVM.start())();
      expect(getByTestId("loading").textContent).toBe("loading");

      action(() => vm.syncVM.fail("Server error"))();
      expect(getByTestId("loading").textContent).toBe("idle");
      expect(getByTestId("error").textContent).toBe("Server error");

      action(() => vm.syncVM.reset())();
      expect(getByTestId("error").textContent).toBe("none");
    });

    it("full MVVM flow: add → toggle → filter → paginate → clear", async () => {
      const vm = new TodoListVM();

      const FullApp = () => (
        <div>
          <span data-testid="total">{vm.totalCount}</span>
          <span data-testid="active">{vm.activeCount}</span>
          <span data-testid="completed">{vm.completedCount}</span>
          <span data-testid="filter">{vm.filterVM.filter}</span>
          <ul data-testid="visible-list">
            {vm.paginatedTodos.map((todo) => (
              <li key={todo.id} data-testid={`item-${todo.id}`}>
                <span>{todo.title}</span>
                <span>{todo.done ? "✓" : "○"}</span>
              </li>
            ))}
          </ul>
        </div>
      );

      const { getByTestId } = render(() => <FullApp />);

      // Step 1: Add 6 todos
      action(() => {
        for (let i = 1; i <= 6; i++) vm.addTodo(`Task ${i}`);
      })();
      expect(getByTestId("total").textContent).toBe("6");
      expect(getByTestId("active").textContent).toBe("6");
      expect(getByTestId("visible-list").children.length).toBe(5); // page 1 of 5 per page

      // Step 2: Complete first 3
      action(() => {
        vm.todos[0].toggle();
        vm.todos[1].toggle();
        vm.todos[2].toggle();
      })();
      expect(getByTestId("active").textContent).toBe("3");
      expect(getByTestId("completed").textContent).toBe("3");

      // Step 3: Filter to active only
      action(() => vm.filterVM.setFilter("active"))();
      expect(getByTestId("filter").textContent).toBe("active");
      expect(getByTestId("visible-list").children.length).toBe(3);

      // Step 4: Clear completed
      action(() => vm.clearCompleted())();
      expect(getByTestId("total").textContent).toBe("3");
      expect(getByTestId("active").textContent).toBe("3");
      expect(getByTestId("completed").textContent).toBe("0");

      // Step 5: Reset filter to all
      action(() => vm.filterVM.setFilter("all"))();
      expect(getByTestId("visible-list").children.length).toBe(3);
    });

    it("editing flow: start → change draft → save", async () => {
      const vm = new TodoListVM();
      vm.addTodo("Original title");

      const EditView = () => (
        <div>
          <span data-testid="title">{vm.todos[0].title}</span>
          <span data-testid="editing">{vm.isEditing ? "editing" : "viewing"}</span>
          {vm.isEditing && (
            <span data-testid="draft">{vm.draftTitle}</span>
          )}
        </div>
      );

      const { getByTestId, queryByTestId } = render(() => <EditView />);
      expect(getByTestId("title").textContent).toBe("Original title");
      expect(getByTestId("editing").textContent).toBe("viewing");
      expect(queryByTestId("draft")).toBeNull();

      action(() => vm.startEditing(vm.todos[0].id))();
      expect(getByTestId("editing").textContent).toBe("editing");
      expect(getByTestId("draft").textContent).toBe("Original title");

      action(() => vm.setDraftTitle("New title"))();
      expect(getByTestId("draft").textContent).toBe("New title");

      action(() => vm.saveEdit())();
      expect(getByTestId("title").textContent).toBe("New title");
      expect(getByTestId("editing").textContent).toBe("viewing");
      expect(queryByTestId("draft")).toBeNull();
    });

    it("editing flow: start → cancel (no changes)", async () => {
      const vm = new TodoListVM();
      vm.addTodo("Original");

      const EditView = () => (
        <div>
          <span data-testid="title">{vm.todos[0].title}</span>
          <span data-testid="editing">{vm.isEditing ? "editing" : "viewing"}</span>
        </div>
      );

      const { getByTestId } = render(() => <EditView />);

      action(() => vm.startEditing(vm.todos[0].id))();
      action(() => vm.setDraftTitle("Changed"))();
      action(() => vm.cancelEdit())();

      expect(getByTestId("title").textContent).toBe("Original");
      expect(getByTestId("editing").textContent).toBe("viewing");
    });

    it("toggleAll updates all todos reactively", async () => {
      const vm = new TodoListVM();
      vm.addTodo("A");
      vm.addTodo("B");
      vm.addTodo("C");

      const ToggleAllView = () => (
        <div>
          <span data-testid="all-done">{vm.allCompleted ? "yes" : "no"}</span>
          <span data-testid="active">{vm.activeCount}</span>
          <span data-testid="completed">{vm.completedCount}</span>
        </div>
      );

      const { getByTestId } = render(() => <ToggleAllView />);
      expect(getByTestId("all-done").textContent).toBe("no");
      expect(getByTestId("active").textContent).toBe("3");

      action(() => vm.toggleAll())();
      expect(getByTestId("all-done").textContent).toBe("yes");
      expect(getByTestId("active").textContent).toBe("0");
      expect(getByTestId("completed").textContent).toBe("3");

      // Toggle all back
      action(() => vm.toggleAll())();
      expect(getByTestId("all-done").textContent).toBe("no");
      expect(getByTestId("active").textContent).toBe("3");
      expect(getByTestId("completed").textContent).toBe("0");
    });

    it("removing a todo updates the view reactively", async () => {
      const vm = new TodoListVM();
      vm.addTodo("A");
      vm.addTodo("B");
      vm.addTodo("C");

      const ListView = () => (
        <ul data-testid="list">
          {vm.todos.map((todo) => (
            <li key={todo.id} data-testid={`item-${todo.id}`}>
              {todo.title}
            </li>
          ))}
        </ul>
      );

      const { getByTestId } = render(() => <ListView />);
      expect(getByTestId("list").children.length).toBe(3);

      const secondId = vm.todos[1].id;
      action(() => vm.removeTodo(secondId))();
      expect(getByTestId("list").children.length).toBe(2);
    });
  });
});

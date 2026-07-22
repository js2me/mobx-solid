import { makeAutoObservable, observable } from "mobx";

export type Filter = "all" | "active" | "completed";

let nextTodoId = 1;

export class Todo {
  id: string;
  title: string;
  done = false;

  constructor(title: string, done = false) {
    this.id = String(nextTodoId++);
    this.title = title;
    this.done = done;
    makeAutoObservable(this);
  }

  toggle() {
    this.done = !this.done;
  }

  setTitle(title: string) {
    this.title = title;
  }
}

class TodoFilterVM {
  filter: Filter = "all";

  constructor() {
    makeAutoObservable(this);
  }

  setFilter(filter: Filter) {
    this.filter = filter;
  }
}

class AsyncOperationVM {
  loading = false;
  error: string | null = null;
  lastSyncedAt: Date | null = null;

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
    this.lastSyncedAt = new Date();
  }

  fail(message: string) {
    this.loading = false;
    this.error = message;
  }
}

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

export class TodoListVM {
  todos: Todo[] = [];
  filterVM = new TodoFilterVM();
  syncVM = new AsyncOperationVM();
  paginationVM = new PaginationVM();
  editingId: string | null = null;
  draftTitle = "";
  newTitle = "";

  constructor() {
    makeAutoObservable(this, {
      filterVM: observable.ref,
      syncVM: observable.ref,
      paginationVM: observable.ref,
    });

    this.seed();
  }

  private seed() {
    const samples = [
      ["Ship mobx-solid playground", false],
      ["Wire enableObservableTracking", true],
      ["Demo observer + Observer", false],
      ["Show createLocalObservable", false],
      ["Bridge with fromObservable", false],
      ["Add filter & pagination", true],
      ["Simulate async sync", false],
    ] as const;

    for (const [title, done] of samples) {
      this.todos.push(new Todo(title, done));
    }
  }

  setNewTitle(title: string) {
    this.newTitle = title;
  }

  addTodo() {
    const title = this.newTitle.trim();
    if (!title) return;
    this.todos.unshift(new Todo(title));
    this.newTitle = "";
    this.paginationVM.setPage(1);
  }

  removeTodo(id: string) {
    this.todos = this.todos.filter((t) => t.id !== id);
    if (this.paginationVM.page > this.totalPages) {
      this.paginationVM.setPage(this.totalPages);
    }
  }

  startEditing(id: string) {
    const todo = this.todos.find((t) => t.id === id);
    if (!todo) return;
    this.editingId = id;
    this.draftTitle = todo.title;
  }

  setDraftTitle(title: string) {
    this.draftTitle = title;
  }

  saveEdit() {
    if (this.editingId && this.draftTitle.trim()) {
      const todo = this.todos.find((t) => t.id === this.editingId);
      todo?.setTitle(this.draftTitle.trim());
    }
    this.editingId = null;
    this.draftTitle = "";
  }

  cancelEdit() {
    this.editingId = null;
    this.draftTitle = "";
  }

  clearCompleted() {
    this.todos = this.todos.filter((t) => !t.done);
    if (this.paginationVM.page > this.totalPages) {
      this.paginationVM.setPage(this.totalPages);
    }
  }

  toggleAll() {
    const allDone = this.todos.every((t) => t.done);
    for (const todo of this.todos) {
      todo.done = !allDone;
    }
  }

  async sync() {
    this.syncVM.start();
    await new Promise((r) => setTimeout(r, 900));
    if (Math.random() < 0.15) {
      this.syncVM.fail("Network blip — try again");
      return;
    }
    this.syncVM.succeed();
  }

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

  get allCompleted() {
    return this.todos.length > 0 && this.todos.every((t) => t.done);
  }

  get totalPages() {
    return Math.max(1, Math.ceil(this.filteredTodos.length / this.paginationVM.pageSize));
  }

  get canGoPrev() {
    return this.paginationVM.page > 1;
  }

  get canGoNext() {
    return this.paginationVM.page < this.totalPages;
  }
}

export const todoListVM = new TodoListVM();

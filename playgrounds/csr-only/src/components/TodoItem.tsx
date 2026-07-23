import type { Todo, TodoListVM } from "../store/todo-list-vm";

export function TodoItem(props: { todo: Todo; vm: TodoListVM }) {
  return (
    <li
      class="todo-item"
      classList={{
        done: props.todo.done,
        editing: props.vm.editingId === props.todo.id,
      }}
    >
      {props.vm.editingId === props.todo.id ? (
        <form
          class="edit-form"
          onSubmit={(e) => {
            e.preventDefault();
            props.vm.saveEdit();
          }}
        >
          <input
            class="edit-input"
            value={props.vm.draftTitle}
            autofocus
            onInput={(e) => props.vm.setDraftTitle(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") props.vm.cancelEdit();
            }}
          />
          <button type="submit" class="btn ghost">
            Save
          </button>
          <button type="button" class="btn ghost" onClick={() => props.vm.cancelEdit()}>
            Cancel
          </button>
        </form>
      ) : (
        <>
          <label class="check">
            <input
              type="checkbox"
              checked={props.todo.done}
              onChange={() => props.todo.toggle()}
            />
            <span class="title">{props.todo.title}</span>
          </label>
          <div class="todo-actions">
            <button
              type="button"
              class="btn ghost"
              onClick={() => props.vm.startEditing(props.todo.id)}
            >
              Edit
            </button>
            <button
              type="button"
              class="btn danger"
              onClick={() => props.vm.removeTodo(props.todo.id)}
            >
              Remove
            </button>
          </div>
        </>
      )}
    </li>
  );
}

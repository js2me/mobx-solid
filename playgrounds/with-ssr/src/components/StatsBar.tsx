import type { TodoListVM } from "../store/todo-list-vm";

/** Plain component: MobX in JSX works via enableObservableTracking() alone. */
export function StatsBar(props: { vm: TodoListVM }) {
  return (
    <div class="stats">
      <div class="stat">
        <span class="stat-value">{props.vm.activeCount}</span>
        <span class="stat-label">active</span>
      </div>
      <div class="stat">
        <span class="stat-value">{props.vm.completedCount}</span>
        <span class="stat-label">done</span>
      </div>
      <div class="stat">
        <span class="stat-value">{props.vm.totalCount}</span>
        <span class="stat-label">total</span>
      </div>
      <div class="stat wide">
        <span class="stat-value mono">
          {props.vm.syncVM.lastSyncedAt
            ? props.vm.syncVM.lastSyncedAt.toLocaleTimeString()
            : "—"}
        </span>
        <span class="stat-label">last sync</span>
      </div>
    </div>
  );
}

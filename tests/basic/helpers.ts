import { _getAdministration, getObserverTree } from "mobx";
import { createRoot, createEffect } from "solid-js";

/**
 * Runs a function inside a SolidJS createRoot and returns the dispose function.
 * Useful for testing reactive primitives without leaking computations.
 */
export function withRoot<T>(fn: () => T): { result: T; dispose: () => void } {
  let result: T;
  let dispose: () => void;
  createRoot((d) => {
    dispose = d;
    result = fn();
  });
  return { result: result!, dispose: dispose! };
}

/**
 * Collects all values emitted by a SolidJS accessor into an array.
 * Returns a dispose function to clean up the effect.
 */
export function collectValues<T>(accessor: () => T): {
  values: T[];
  dispose: () => void;
} {
  const values: T[] = [];
  let dispose: () => void;
  createRoot((d) => {
    dispose = d;
    createEffect(() => {
      values.push(accessor());
    });
  });
  return { values, dispose: dispose! };
}

/** Number of MobX reactions currently observing `obj[prop]`. */
export function observerCount(obj: object, prop: string): number {
  return (_getAdministration(obj, prop) as { observers_: Set<unknown> })
    .observers_.size;
}

/** Names of MobX reactions currently observing `obj[prop]`. */
export function observerNames(obj: object, prop: string): string[] {
  const tree = getObserverTree(obj, prop) as {
    observers?: Array<{ name: string }>;
  };
  return (tree.observers ?? []).map((o) => o.name);
}

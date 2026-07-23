import { autorun } from "mobx";
import { createSignal, onCleanup, type Accessor } from "solid-js";

/**
 * Converts an observable getter into a SolidJS signal accessor.
 *
 * Creates a SolidJS signal that tracks an observable expression.
 * When the observable changes, the SolidJS signal updates,
 * and any SolidJS computation depending on it re-evaluates.
 *
 * This is useful for bridging individual observables into
 * SolidJS's reactive system without using `enableObservableTracking` globally.
 * However, if `enableObservableTracking()` has been called, you don't need
 * this — MobX observables work directly inside SolidJS computations.
 *
 * @param getter - A function that reads an observable value
 * @returns A SolidJS accessor function
 *
 * @example
 * ```ts
 * const count = obs(() => store.count);
 * // count() is a SolidJS accessor that updates when store.count changes
 * ```
 */
export function obs<T>(getter: () => T): Accessor<T> {
  const [value, setValue] = createSignal<T>(undefined as unknown as T, {
    equals: false,
  });

  const dispose = autorun(() => {
    setValue(getter);
  });

  onCleanup(dispose);

  return value;
}

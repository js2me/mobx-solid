import { observable, type AnnotationsMap } from "mobx";

/**
 * Creates a local MobX observable store that persists for the
 * lifetime of the SolidJS component.
 *
 * Analogous to `useLocalObservable` from mobx-react-lite, adapted for
 * SolidJS's primitive naming conventions (`create*` prefix).
 *
 * Since SolidJS components run only once (no re-renders), the observable
 * is created on first call and persists for the component's lifetime
 * without needing a persistence mechanism like React's `useState`.
 *
 * @param initializer - Function returning the initial state object
 * @param annotations - Optional MobX annotation map for fine-grained control
 * @returns The observable store
 *
 * @example
 * ```ts
 * const store = createLocalObservable(() => ({
 *   count: 0,
 *   get double() { return this.count * 2 },
 *   increment() { this.count++ }
 * }));
 * ```
 */
export function createLocalObservable<
  TStore extends Record<string, unknown>,
>(
  initializer: () => TStore,
  annotations?: AnnotationsMap<TStore, never>,
): TStore {
  return observable(initializer(), annotations, { autoBind: true });
}

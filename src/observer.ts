import { createMemo, type Component, type JSX } from "solid-js";
import { isUsingStaticRendering } from "./static-rendering";
import { ensureBinding } from "./internal/ensure-binding";

/**
 * Wraps a SolidJS component to ensure MobX observables are properly tracked.
 *
 * In SolidJS, components run only once and fine-grained reactivity handles
 * updates via reactive expressions in JSX. However, MobX observables accessed
 * in the component body outside of JSX expressions won't trigger updates
 * because the component body is not a SolidJS computation.
 *
 * `observer` wraps the component's return in a `createMemo`, ensuring the
 * entire JSX evaluation runs inside a SolidJS computation that tracks MobX
 * via `enableExternalSource`. The memo accessor is returned so that SolidJS's
 * rendering system can reactively track changes.
 *
 * **Important**: `enableObservableTracking()` must be called at the app
 * entry point before rendering any `observer` component (module-level
 * `observer(...)` wrappers are fine — the check runs on first render).
 *
 * @param component - A SolidJS component function
 * @returns A wrapped component that tracks MobX observables
 *
 * @example
 * ```tsx
 * import { enableObservableTracking, observer } from "mobx-solid";
 * enableObservableTracking();
 *
 * const Counter = observer(() => {
 *   return <div>{store.count}</div>;
 * });
 * ```
 */
export function observer<P extends Record<string, unknown>>(
  component: Component<P>,
): Component<P> {
  if (isUsingStaticRendering()) {
    return component;
  }

  const wrapped: Component<P> = (props) => {
    if (isUsingStaticRendering()) {
      return component(props);
    }

    // Defer to render time: with ESM, module-scope `observer(...)` runs
    // during import — before the entry point can call
    // `enableObservableTracking()`.
    ensureBinding();

    const memo = createMemo(() => component(props));
    // Return the memo accessor. In SolidJS, function values in JSX
    // are called inside reactive computations, so the DOM updates
    // when the memo re-evaluates due to MobX observable changes.
    return memo as unknown as JSX.Element;
  };

  if (process.env.NODE_ENV !== "production") {
    // Preserve component identity for debugging
    Object.defineProperty(wrapped, "displayName", {
      value:
        (component as { displayName?: string }).displayName || component.name,
      configurable: true,
    });
  }

  return wrapped;
}

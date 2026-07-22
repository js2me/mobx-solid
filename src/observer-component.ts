import { createMemo, type JSX } from "solid-js";
import { isUsingStaticRendering } from "./static-rendering";
import { ensureBinding } from "./internal/ensure-binding";

export interface ObserverProps {
  children: () => JSX.Element;
}

/**
 * A component that creates a MobX-aware reactive boundary.
 *
 * Useful for wrapping parts of JSX that read MobX observables,
 * when you don't want to use `observer()` on the whole component.
 *
 * The children function is evaluated inside a `createMemo` computation,
 * which — with `enableObservableTracking()` active — tracks MobX observables
 * and re-evaluates when they change.
 *
 * The memo accessor is returned so that SolidJS's rendering system
 * reactively tracks changes.
 *
 * @example
 * ```tsx
 * <Observer>{() => <div>{store.count}</div>}</Observer>
 * ```
 */
export function Observer(props: ObserverProps): JSX.Element {
  if (isUsingStaticRendering()) {
    return props.children();
  }

  ensureBinding();

  const memo = createMemo(() => props.children());
  // Return the memo accessor. In SolidJS JSX, function values are
  // called inside reactive computations, so the DOM updates when
  // the memo re-evaluates due to MobX observable changes.
  return memo as unknown as JSX.Element;
}

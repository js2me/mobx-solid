import { IReactionOptions, reaction } from "mobx";
import { createSignal, onCleanup, untrack, type Accessor, type SignalOptions } from "solid-js";

const NO_EQUALS: SignalOptions<unknown> = { equals: false };
const NO_EQUALS_MOBX: IReactionOptions<unknown, false> = { equals: () => false };

/**
 * Converts a MobX observable expression into a SolidJS signal accessor.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/obs)
 */

function obsSSR<T>(getter: () => T): Accessor<T> {
  const [value] = createSignal<T>(getter(), NO_EQUALS);
  return value;
}

function obsClient<T>(getter: () => T): Accessor<T> {
  const [value, setValue] = createSignal<T>(untrack(getter), NO_EQUALS);
  const dispose = reaction(getter, (v) => setValue(() => v), NO_EQUALS_MOBX);
  onCleanup(dispose);
  return value;
}

// getter runs twice on mount (untrack + reaction data fn) — negligible for pure getters.
// Data fn calls getter directly, not via Solid untrack(), because untrack() delegates to
// mobxUntracked() which kills all MobX tracking when EOT is enabled.
// () => v wrapper prevents Solid's setter from invoking function-type values as updaters.

export const obs: <T>(getter: () => T) => Accessor<T> =
  typeof window === "undefined" ? obsSSR : obsClient;

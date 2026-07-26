import { IReactionOptions, reaction } from "mobx";
import { createSignal, onCleanup, untrack, type Accessor, type SignalOptions } from "solid-js";

const NO_EQUALS: SignalOptions<unknown> = { equals: false };
const NO_EQUALS_MOBX_REACTION: IReactionOptions<unknown, false> = { equals: () => false };

/**
 * Converts a MobX observable expression into a SolidJS signal accessor.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/obs)
 */

/** SSR: static signal, no MobX reaction — no zombie leak. */
function obsSSR<T>(getter: () => T): Accessor<T> {
  const [value] = createSignal<T>(getter(), NO_EQUALS);
  return value;
}

/** Client: signal + MobX reaction. getter runs twice on mount (once via untrack for
 *  initial value, once in the reaction data fn for MobX tracking) — negligible for
 *  pure getters. Data fn calls getter directly, NOT inside Solid's untrack(), because
 *  untrack() delegates to mobxUntracked() which disables ALL MobX tracking when EOT
 *  is enabled. Inside the reaction context, EOT's factory is not invoked anyway. */
function obsClient<T>(getter: () => T): Accessor<T> {
  const [value, setValue] = createSignal<T>(untrack(getter), NO_EQUALS);
  const dispose = reaction(getter, setValue, NO_EQUALS_MOBX_REACTION);
  onCleanup(dispose);
  return value;
}

export const obs: <T>(getter: () => T) => Accessor<T> =
  typeof window === "undefined" ? obsSSR : obsClient;

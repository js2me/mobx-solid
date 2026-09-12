import { Reaction, untracked as mobxUntracked } from "mobx";
import * as solid from "solid-js";
import { reactionName, getTrackingState } from "./internals";

const { enableExternalSource } = solid;

// `createResource` exists only in Solid 1. Reflect.get hides the reference
// from bundlers, which fail or warn on static access to this removed export.
const createResource = Reflect.get(solid, "createResource") as unknown;

type ExternalSource = {
  track: (value: unknown) => unknown;
  dispose: () => void;
};

type ExternalSourceFactory = (
  fn: (value: unknown) => unknown,
  trigger: () => void,
) => ExternalSource;

const externalSourceFactory: ExternalSourceFactory = (fn, trigger) => {
  const state = getTrackingState();
  // Lazy: disable() disposes live reactions — a re-run after re-enable must subscribe afresh.
  let reaction: Reaction | undefined;

  const disposeReaction = () => {
    if (reaction) {
      state.reactions.delete(disposeReaction);
      reaction.dispose();
      reaction = undefined;
    }
  };

  return {
    track: (value) => {
      // Bridge disabled — read MobX state as plain values, subscribing nothing.
      if (!state.enabled) return fn(value);
      if (!reaction) {
        reaction = new Reaction(reactionName, trigger);
        state.reactions.add(disposeReaction);
      }
      let result: unknown;
      reaction.track(() => {
        result = fn(value);
      });
      return result;
    },
    dispose: disposeReaction,
  };
};

/**
 * Enables MobX observable tracking inside SolidJS reactive computations.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/enable-observable-tracking)
 */
export const enableObservableTracking = () => {
  const state = getTrackingState();

  if (state.enabled) return;

  state.enabled = true;

  if (state.registered) return;

  state.registered = true;

  // Solid 2 accepts a config object, while Solid 1 accepts positional arguments.
  if (typeof createResource === 'undefined') {
    (enableExternalSource as unknown as (config: {
      factory: ExternalSourceFactory;
      untrack: typeof mobxUntracked;
    }) => void)({ factory: externalSourceFactory, untrack: mobxUntracked });
  } else {
    (enableExternalSource as unknown as (
      factory: ExternalSourceFactory,
      untrack: typeof mobxUntracked,
    ) => void)(externalSourceFactory, mobxUntracked);
  }
}

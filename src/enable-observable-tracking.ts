import { Reaction, untracked as mobxUntracked } from "mobx";
import { enableExternalSource } from "solid-js";
import { reactionName, getTrackingState } from "./internals";

type ExternalSource = {
  track: (value: unknown) => unknown;
  dispose: () => void;
};

const externalSourceFactory = (fn: ExternalSource['track'], trigger: VoidFunction): ExternalSource => {
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
// Solid 1 invokes the arg as factory, Solid 2 destructures { factory, untrack } — one callable covers both.
externalSourceFactory.factory = externalSourceFactory;
externalSourceFactory.untrack = mobxUntracked;

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

  (enableExternalSource as unknown as (
    arg: typeof externalSourceFactory,
    untrack: typeof mobxUntracked,
  ) => void)(externalSourceFactory, mobxUntracked);
}

import { Reaction, untracked as mobxUntracked } from "mobx";
import { enableExternalSource } from "solid-js";
import { reactionName, getTrackingState } from "./internals";

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

// Solid 1 takes (factory, untrack) positionally, Solid 2 takes a single
// { factory, untrack } config object. A callable factory carrying both
// fields satisfies either signature, no version detection needed.
const compatArg = externalSourceFactory as ExternalSourceFactory & {
  factory: ExternalSourceFactory;
  untrack: typeof mobxUntracked;
};
compatArg.factory = externalSourceFactory;
compatArg.untrack = mobxUntracked;

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
    arg: typeof compatArg,
    untrack: typeof mobxUntracked,
  ) => void)(compatArg, mobxUntracked);
}

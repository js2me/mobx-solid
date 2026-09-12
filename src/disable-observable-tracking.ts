import { getTrackingState } from "./internals";

/**
 * Disables MobX observable tracking inside SolidJS reactive computations.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/disable-observable-tracking)
 */
export const disableObservableTracking = () => {
  const state = getTrackingState();

  if (!state.enabled) return;

  state.enabled = false;

  state.reactions.forEach((disposeReaction) => disposeReaction());
};

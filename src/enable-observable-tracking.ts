import { Reaction, untracked as mobxUntracked } from "mobx";
import { enableExternalSource } from "solid-js";

const reactionName = "mobx-solid"

type ExternalSource = {
  track: (value: unknown) => unknown;
  dispose: () => void;
};

type ExternalSourceFactory = (
  fn: (value: unknown) => unknown,
  trigger: () => void,
) => ExternalSource;

const externalSourceFactory: ExternalSourceFactory = (fn, trigger) => {
  const reaction = new Reaction(reactionName, trigger);

  return {
    track: (value) => {
      let result: unknown;
      reaction.track(() => {
        result = fn(value);
      });
      return result;
    },
    dispose: () => reaction.dispose(),
  };
};

/**
 * Enables MobX observable tracking inside SolidJS reactive computations.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/enable-observable-tracking)
 */
export const enableObservableTracking = () => {
  if (enableObservableTracking._) return;

  enableObservableTracking._ = true;

  // Solid 2 changed enableExternalSource from
  //   enableExternalSource(factory, untrack)
  // to
  //   enableExternalSource({ factory, untrack }).
  // Keep the public package usable with either supported Solid major.
  if (enableExternalSource.length === 1) {
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

enableObservableTracking._ = false;

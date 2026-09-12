import { Reaction, untracked as mobxUntracked } from "mobx";
import * as solid from "solid-js";

const { enableExternalSource } = solid;

// `createResource` exists only in Solid 1. Reflect.get hides the reference
// from bundlers, which fail or warn on static access to this removed export.
const createResource = Reflect.get(solid, "createResource") as unknown;

const reactionName = "mobx-solid";
const trackingSymbol = Symbol.for(reactionName);

declare const globalThis: { [trackingSymbol]?: true }

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
  if (globalThis[trackingSymbol]) return;

  globalThis[trackingSymbol] = true;

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

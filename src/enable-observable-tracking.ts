import { Reaction, untracked as mobxUntracked } from "mobx";
import { enableExternalSource } from "solid-js";

const reactionName = "mobx-solid"

/**
 * Enables MobX observable tracking inside SolidJS reactive computations.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/enable-observable-tracking)
 */
export const enableObservableTracking = () => {
  if (enableObservableTracking._) return;

  enableObservableTracking._ = true;

  enableExternalSource(
    <Prev, Next extends Prev>(fn: (v: Prev) => Next, trigger: () => void) => {
      const reaction = new Reaction(reactionName, trigger);

      return {
        track: (x: Prev) => {
          let result: unknown;
          reaction.track(() => {
            result = fn(x);
          });
          return result as Next;
        },
        dispose: () => reaction.dispose(),
      };
    },
    mobxUntracked,
  );
}

enableObservableTracking._ = false;

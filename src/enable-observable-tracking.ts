import { Reaction, untracked as mobxUntracked } from "mobx";
import { enableExternalSource } from "solid-js";

let trackingEnabled = false;

/**
 * Enables MobX observable tracking inside SolidJS reactive computations.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/enable-observable-tracking)
 */
export function enableObservableTracking(): void {
  if (trackingEnabled) return;
  trackingEnabled = true;

  enableExternalSource(
    <Prev, Next extends Prev>(fn: (v: Prev) => Next, trigger: () => void) => {
      const reaction = new Reaction("mobx-solid", trigger);

      return {
        track: (x: Prev) => {
          let result: unknown;
          reaction.track(() => {
            result = fn(x);
          });
          return result as Next;
        },
        dispose: () => {
          reaction.dispose();
        },
      };
    },
    (fn) => mobxUntracked(fn),
  );
}

/** @internal Whether `enableObservableTracking()` has already been called. */
export function isObservableTrackingEnabled(): boolean {
  return trackingEnabled;
}

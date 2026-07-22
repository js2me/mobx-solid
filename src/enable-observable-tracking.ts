import { Reaction, untracked as mobxUntracked } from "mobx";
import { enableExternalSource } from "solid-js";

let trackingEnabled = false;

/**
 * Enables observable tracking inside SolidJS reactive computations.
 *
 * Must be called once before any MobX observables are used inside
 * SolidJS reactive computations (createEffect, createMemo, etc.).
 *
 * This calls SolidJS's `enableExternalSource` with a factory that
 * wraps every computation in a MobX Reaction, synchronizing the
 * two reactive graphs:
 * - When a MobX observable changes → MobX Reaction calls SolidJS trigger →
 *   SolidJS re-evaluates the computation → MobX re-tracks dependencies
 * - When SolidJS disposes a computation → MobX Reaction is disposed
 *
 * Should be called at application entry point:
 * ```ts
 * import { enableObservableTracking } from "mobx-solid";
 * enableObservableTracking();
 * ```
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

/**
 * @internal
 */
export function isObservableTrackingEnabled(): boolean {
  return trackingEnabled;
}

/**
 * Resets the enabled flag for unit tests that assert deferred binding checks.
 * Does not undo SolidJS `enableExternalSource` registration.
 *
 * @internal
 */
export function resetObservableTrackingForTests(): void {
  trackingEnabled = false;
}

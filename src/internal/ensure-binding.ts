import { isObservableTrackingEnabled } from "../enable-observable-tracking";

/**
 * Asserts that `enableObservableTracking()` has been called.
 * @throws If observable tracking is not enabled.
 */
export function ensureBinding(): void {
  if (!isObservableTrackingEnabled()) {
    throw new Error(
      "[mobx-solid] Observable tracking is not enabled. " +
        "Call enableObservableTracking() at your application entry point " +
        "before using observer, Observer, or MobX observables in SolidJS computations.",
    );
  }
}

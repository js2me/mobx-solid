export const reactionName = "mobx-solid";

const trackingSymbol = Symbol.for(reactionName);

export type TrackingState = {
  /** Whether MobX reads inside Solid computations feed bridged reactions. */
  enabled: boolean;
  /**
   * Whether Solid's `enableExternalSource` was already called. It must run
   * exactly once per realm: Solid 1 chains factories on repeat calls, which
   * would wrap every computation in extra reactions.
   */
  registered: boolean;
  /** Teardown callbacks of every live bridged MobX reaction. */
  reactions: Set<() => void>;
};

declare const globalThis: { [trackingSymbol]?: TrackingState };

export const getTrackingState = (): TrackingState => {
  return (globalThis[trackingSymbol] ??= {
    enabled: false,
    registered: false,
    reactions: new Set(),
  });
};

// Core bridge — must be called at app entry point
export { enableObservableTracking } from "./enable-observable-tracking";

// Converts observable getter to SolidJS accessor (no global tracking required)
export { fromObservable } from "./from-observable";

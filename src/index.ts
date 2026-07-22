// Core bridge — must be called at app entry point
export { enableObservableTracking } from "./enable-observable-tracking";

// Component utilities
export { observer } from "./observer";
export { Observer } from "./observer-component";

// Local state
export { createLocalObservable } from "./create-local-observable";

// Convenience — converts observable getter to SolidJS accessor
export { fromObservable } from "./from-observable";

// SSR
export { enableStaticRendering, isUsingStaticRendering } from "./static-rendering";

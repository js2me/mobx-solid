# disableObservableTracking

```ts
function disableObservableTracking(): void
```

Disables the MobX → SolidJS reactivity bridge configured by [`enableObservableTracking()`](/api/enable-observable-tracking).

## When to call

- After server-side rendering, to release the MobX reactions created during the render pass.
- In tests, to return to plain SolidJS behavior.

Calling it when the bridge is already disabled — or was never enabled — is a no-op.

## Behavior

- Every live bridged MobX reaction is disposed: observables release their observers and stop triggering Solid recomputations.
- Solid computations keep reading current MobX values, but those reads no longer subscribe — MobX changes cause no further updates.

SolidJS has no API to unregister an external source, so the bridge itself stays installed but inert.

## Example — SSR cleanup

```tsx
import { enableObservableTracking, disableObservableTracking } from "mobx-solid";
import { renderToString } from "solid-js/web";

enableObservableTracking();
const html = renderToString(() => <App />);
disableObservableTracking();
```

## Re-enabling

Call [`enableObservableTracking()`](/api/enable-observable-tracking) again to re-enable the bridge. Solid's external source is registered only once per realm, so toggling is safe. Computations created while the bridge was enabled resume MobX tracking on their next re-run; computations created while disabled stay plain until they re-run.

## Related

- [`enableObservableTracking`](/api/enable-observable-tracking)
- [How It Works](/guide/how-it-works)

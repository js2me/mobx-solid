# enableObservableTracking

```ts
function enableObservableTracking(): void
```

Enables MobX observable tracking inside SolidJS reactive computations.

Originally authored by [Dmitry Kazakov](https://github.com/dkazakov8).

## When to call

**Call once** at the application entry point, before any MobX observables are used inside SolidJS reactive computations or JSX.

```ts
import { enableObservableTracking } from "mobx-solid";

enableObservableTracking();
```

Calling it more than once is a no-op.

## Behavior

After this runs, SolidJS’s `enableExternalSource` is configured so that:

- Solid computations and JSX expressions track MobX observables
- MobX changes trigger the corresponding Solid recomputations
- Bridged MobX reactions dispose when Solid scopes clean up

You can then read MobX state directly:

```tsx
function Counter() {
  return <div>{store.count}</div>;
}
```

See [Reading Observables](/guide/reading-observables) for where reads must live to stay reactive.

## Related

- [How It Works](/guide/how-it-works)
- [`obs`](/api/obs) — per-expression bridge without global tracking

# obs

:::danger Deprecated
`obs()` is deprecated. Use [`enableObservableTracking()`](/api/enable-observable-tracking) instead — it makes all MobX reads reactive inside Solid computations and JSX, so `obs()` is unnecessary. `obs()` will be removed in the first release.
:::

```ts
function obs<T>(getter: () => T): Accessor<T>
```

Converts a MobX observable expression into a SolidJS signal accessor.

Useful when you want to bridge a single MobX value into Solid **without** calling `enableObservableTracking()`.

## Parameters

| Name | Type | Description |
| --- | --- | --- |
| `getter` | `() => T` | Function that reads an observable value |

## Returns

A SolidJS `Accessor<T>` that updates when the observable expression changes.

## Example

```tsx
import { obs } from "mobx-solid";

const count = obs(() => store.count);
// count() is a SolidJS accessor that updates when store.count changes

function Counter() {
  return <div>{count()}</div>;
}
```

## Notes

- Internally uses MobX `autorun` and a Solid `createSignal` with `equals: false`.
- The autorun is disposed via Solid `onCleanup` when the owning reactive scope is cleaned up.
- If `enableObservableTracking()` is already enabled, you usually do not need this — read MobX observables directly inside Solid computations and JSX.

## Related

- [`enableObservableTracking`](/api/enable-observable-tracking)
- [Reading Observables](/guide/reading-observables)

# Comparison with mobx-react-lite

**mobx-solid** targets SolidJS the way [mobx-react-lite](https://github.com/mobxjs/mobx/tree/main/packages/mobx-react-lite) targets React, but the integration model differs because the UI libraries differ.

| Feature | mobx-react-lite | mobx-solid |
| --- | --- | --- |
| Component model | Re-render entire component | Fine-grained DOM updates |
| Bridge | React `useSyncExternalStore` | SolidJS `enableExternalSource` |
| Wrappers | `observer` required | Not needed after `enableObservableTracking()` |
| Local store | `useLocalObservable` | Plain MobX `observable` / `makeAutoObservable` |

## Practical differences

- **No `observer`**: after the one-time `enableObservableTracking()` call, components can read MobX state in JSX without wrapping.
- **Fine-grained updates**: Solid patches only the reactive sinks that depend on changed data, instead of re-running the whole component function for every update.
- **Stores**: create stores with normal MobX APIs; there is no Solid-specific local-store hook.

## When to choose which

- Use **mobx-react-lite** in React apps.
- Use **mobx-solid** in SolidJS apps when you want MobX as the state layer and Solid as the view layer.

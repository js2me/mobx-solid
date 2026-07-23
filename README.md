# mobx-solid

MobX bindings for [SolidJS](https://www.solidjs.com/) — reactive state management with fine-grained UI updates.

## Installation

```bash
npm install mobx-solid mobx solid-js
# or
pnpm add mobx-solid mobx solid-js
```

## Quick Start

```tsx
import { enableObservableTracking } from "mobx-solid";
import { observable } from "mobx";
import { render } from "solid-js/web";

// 1. Call once at app entry point
enableObservableTracking();

// 2. Create a MobX store
const store = observable({
  count: 0,
  get double() {
    return this.count * 2;
  },
  increment() {
    this.count++;
  },
});

// 3. Read MobX observables in JSX — Solid tracks them via enableExternalSource
function Counter() {
  return (
    <div>
      <p>
        {store.count} × 2 = {store.double}
      </p>
      <button onClick={() => store.increment()}>+</button>
    </div>
  );
}

render(() => <Counter />, document.getElementById("app")!);
```

## API

### `enableObservableTracking()`

Originally authored by [Dmitry Kazakov](https://github.com/dkazakov8).

**Must be called once at your application entry point** before using any MobX observables in SolidJS components.

This bridges MobX's reactive system with SolidJS's by using SolidJS's `enableExternalSource` API. After calling this:

- All SolidJS computations (`createEffect`, `createMemo`, `createComputed`, `createRenderEffect`) and JSX expressions automatically track MobX observables
- When a MobX observable changes, the affected SolidJS computations re-evaluate
- MobX reactions are automatically disposed when SolidJS scopes are cleaned up

No HOC or wrapper components are required — read MobX state directly in JSX.

```ts
import { enableObservableTracking } from "mobx-solid";
enableObservableTracking();
```

### `obs(getter)`

Converts a MobX observable expression into a SolidJS signal accessor. Useful for bridging individual MobX observables into SolidJS's reactive system **without** requiring `enableObservableTracking()`.

```tsx
// Without enableObservableTracking — standalone bridge
const count = obs(() => store.count);
// count() is a SolidJS accessor that updates when store.count changes
```

When `enableObservableTracking()` is already enabled, you usually don't need this — MobX observables work directly inside SolidJS computations.

## How It Works

SolidJS provides `enableExternalSource(factory, untrack)` as an official API for integrating external reactive systems. `mobx-solid` uses this to bridge MobX and SolidJS:

1. `enableObservableTracking()` registers a factory that creates a MobX `Reaction` for each SolidJS computation
2. The reaction's `track` method runs the computation inside MobX's tracking context
3. When a MobX observable changes, the reaction calls SolidJS's `trigger`, causing the computation to re-evaluate
4. When a SolidJS scope is disposed, the MobX reaction is cleaned up automatically

This means MobX observables work transparently inside SolidJS reactive primitives — no manual subscriptions or component wrappers needed.

## Reading MobX outside JSX

SolidJS component bodies run only once. Values captured in the body (outside JSX / effects) are not reactive:

```tsx
// ❌ Stale — body runs once
function Bad() {
  const n = store.count;
  return <div>{n}</div>;
}

// ✅ Reactive — expression lives in JSX
function Good() {
  return <div>{store.count}</div>;
}

// ✅ Also fine — Solid computation
function AlsoGood() {
  createEffect(() => {
    console.log(store.count);
  });
  return null;
}
```

## Differences from mobx-react-lite

| Feature | mobx-react-lite | mobx-solid |
|---------|-----------------|------------|
| Component model | Re-render entire component | Fine-grained DOM updates |
| Bridge | React `useSyncExternalStore` | SolidJS `enableExternalSource` |
| Wrappers | `observer` required | Not needed after `enableObservableTracking()` |
| Local store | `useLocalObservable` | Plain MobX `observable` / `makeAutoObservable` |

## License

MIT

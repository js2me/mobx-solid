# mobx-solid

MobX bindings for [SolidJS](https://www.solidjs.com/) — reactive state management with fine-grained UI updates.

Works similarly to [mobx-react-lite](https://github.com/mobxjs/mobx-react-lite) but adapted for SolidJS's reactivity model.

## Installation

```bash
npm install mobx-solid mobx solid-js
# or
pnpm add mobx-solid mobx solid-js
```

## Quick Start

```tsx
import { enableObservableTracking, observer, createLocalObservable } from "mobx-solid";
import { render } from "solid-js/web";

// 1. Call once at app entry point
enableObservableTracking();

// 2. Create a MobX store
const store = createLocalObservable(() => ({
  count: 0,
  get double() {
    return this.count * 2;
  },
  increment() {
    this.count++;
  },
}));

// 3. Use observer to make the component reactive to MobX changes
const Counter = observer(() => (
  <div>
    <p>
      {store.count} × 2 = {store.double}
    </p>
    <button onClick={store.increment}>+</button>
  </div>
));

render(() => <Counter />, document.getElementById("app")!);
```

## API

### `enableObservableTracking()`

**Must be called once at your application entry point** before using any MobX observables in SolidJS components.

This bridges MobX's reactive system with SolidJS's by using SolidJS's `enableExternalSource` API. After calling this:

- All SolidJS computations (`createEffect`, `createMemo`, `createComputed`, `createRenderEffect`) automatically track MobX observables
- When a MobX observable changes, the affected SolidJS computations re-evaluate
- MobX reactions are automatically disposed when SolidJS scopes are cleaned up

```ts
import { enableObservableTracking } from "mobx-solid";
enableObservableTracking();
```

### `observer(component)`

Wraps a SolidJS component to make it reactive to MobX observables. The component's JSX is evaluated inside a `createMemo` computation, which tracks MobX observables via `enableExternalSource`.

Call `enableObservableTracking()` at the app entry point before rendering (module-level `observer(...)` is fine — the binding is checked on first render).

```tsx
const MyComponent = observer(() => {
  return <div>{store.count}</div>;
});
```


In SolidJS, components run only once. Fine-grained updates happen through reactive expressions in JSX (compiled by SolidJS). `observer` ensures that MobX observables read anywhere in the component — both in JSX expressions and in the component body — are properly tracked.

### `<Observer>`

A component that creates a MobX-aware reactive boundary. Useful for wrapping specific parts of JSX without wrapping the entire component.

```tsx
<div>
  <p>Static content</p>
  <Observer>{() => <p>{store.count}</p>}</Observer>
</div>
```

### `createLocalObservable(initializer, annotations?)`

Creates a local MobX observable store that persists for the component's lifetime. Analogous to `useLocalObservable` from mobx-react-lite, named following SolidJS's `create*` convention.

```tsx
const Counter = observer(() => {
  const store = createLocalObservable(() => ({
    count: 0,
    get double() {
      return this.count * 2;
    },
    increment() {
      this.count++;
    },
  }));

  return (
    <div>
      <span>{store.count}</span>
      <button onClick={store.increment}>+</button>
    </div>
  );
});
```

### `fromObservable(getter)`

Converts a MobX observable expression into a SolidJS signal accessor. Useful for bridging individual MobX observables into SolidJS's reactive system without requiring `enableObservableTracking()`.

```tsx
// Without enableObservableTracking — standalone bridge
const count = fromObservable(() => store.count);
// count() is a SolidJS accessor that updates when store.count changes
```

### `enableStaticRendering(enable)` / `isUsingStaticRendering()`

For server-side rendering. When static rendering is enabled, `observer` and `Observer` skip MobX integration and render without creating reactions.

```ts
if (typeof window === "undefined") {
  enableStaticRendering(true);
}
```

## How It Works

SolidJS provides `enableExternalSource(factory, untrack)` as an official API for integrating external reactive systems. `mobx-solid` uses this to bridge MobX and SolidJS:

1. `enableObservableTracking()` registers a factory that creates a MobX `Reaction` for each SolidJS computation
2. The reaction's `track` method runs the computation inside MobX's tracking context
3. When a MobX observable changes, the reaction calls SolidJS's `trigger`, causing the computation to re-evaluate
4. When a SolidJS scope is disposed, the MobX reaction is cleaned up automatically

This means MobX observables work transparently inside SolidJS reactive primitives — no manual subscriptions or synchronization needed.

## Differences from mobx-react-lite

| Feature | mobx-react-lite | mobx-solid |
|---------|----------------|------------|
| Component model | Re-render entire component | Fine-grained DOM updates |
| `observer` | Forces re-render via `useSyncExternalStore` | Wraps in `createMemo` for MobX tracking |
| `useLocalObservable` | Uses `useState` for persistence | Simple call (components run once) |
| `useAsObservableSource` | Deprecated | Not needed (not applicable) |
| `useObserver` | Deprecated | Not needed (not applicable) |
| Bridge mechanism | React `useSyncExternalStore` | SolidJS `enableExternalSource` |

## License

MIT

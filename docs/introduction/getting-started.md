# Getting Started

**mobx-solid** connects [MobX](https://mobx.js.org/) observables to [SolidJS](https://www.solidjs.com/) reactivity. After a one-time setup, you can read MobX state in JSX and Solid computations; when observables change, Solid re-evaluates only the affected parts of the UI.

Current package version: `@{packageJson.version}`.

## Installation

```bash
npm install mobx-solid mobx solid-js
# or
pnpm add mobx-solid mobx solid-js
```

Peer dependencies:

- `mobx` ^6
- `solid-js` ^1.6

## Quick Start

```tsx
import { enableObservableTracking } from "mobx-solid";
import { observable } from "mobx";
import { render } from "solid-js/web";

// 1. Call once at the app entry point
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

## What to call

| Goal | API |
| --- | --- |
| Track MobX everywhere in Solid (recommended) | [`enableObservableTracking()`](/api/enable-observable-tracking) |
| Bridge one expression to a Solid accessor | [`obs(getter)`](/api/obs) |

Most apps only need `enableObservableTracking()`. Use `obs` when you want a Solid signal without enabling global tracking, or when bridging a single value into existing Solid code.

## Next steps

- [How It Works](/guide/how-it-works) — how the MobX ↔ Solid bridge is built
- [Reading Observables](/guide/reading-observables) — where reads must live to stay reactive
- [API Reference](/api/enable-observable-tracking)

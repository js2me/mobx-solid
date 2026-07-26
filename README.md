# mobx-solid

MobX bindings for [SolidJS](https://www.solidjs.com/) — reactive state management with fine-grained UI updates.

Bridge MobX observables with SolidJS's compile-time reactivity — no proxy hacks, no double tracking.

**~0.4 kB gzip** · Zero config · TypeScript-first · SSR-ready

---

## 📖 [Read docs →](https://js2me.github.io/mobx-solid)

---

## Why mobx-solid?

| Feature | What you get |
|---|---|
| Fine-grained reactivity | Only DOM nodes that depend on changed observables update |
| MobX ecosystem | `observable`, `action`, `computed`, `autorun` — the full toolbox |
| Zero boilerplate | No `observer()` HOC, no `useSyncExternalStore` — just write components |
| SSR support | Works with SolidJS server-side rendering out of the box |
| TypeScript-first | Full type safety with zero `any` escapes |
| Tiny footprint | ~0.4 kB gzip — minimal runtime overhead |

---

## Installation

```bash
npm install mobx-solid mobx solid-js
# or
pnpm add mobx-solid mobx solid-js
```

---

## Quick Start

```tsx
import { enableObservableTracking } from "mobx-solid";
import { observable } from "mobx";
import { render } from "solid-js/web";

// Enable MobX → SolidJS reactivity bridge (call once at app startup)
enableObservableTracking();

const store = observable({
  count: 0,
  get double() {
    return this.count * 2;
  },
  increment() {
    this.count++;
  },
});

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

> Call `enableObservableTracking()` once at your app's entry point — after that, MobX observables automatically integrate with SolidJS's reactivity system.

---

## How it works

mobx-solid hooks into MobX's internal reaction tracking and translates observable reads into SolidJS reactive primitives. When a MobX observable changes, only the exact SolidJS DOM nodes that read that value update — true fine-grained reactivity, not component-level re-rendering.

---

## API

| Function | Description |
|---|---|
| `enableObservableTracking()` | Enable the MobX → SolidJS reactivity bridge |
| `disableObservableTracking()` | Disable the bridge (useful for SSR cleanup) |
| `observable` | MobX observable — works with SolidJS components automatically |
| `computed` | MobX computed — auto-tracked by SolidJS |
| `action` | MobX action — batch mutations for optimal DOM updates |

---

## SSR Support

```tsx
import { enableObservableTracking, disableObservableTracking } from "mobx-solid";

enableObservableTracking();
const html = renderToString(() => <App />);
disableObservableTracking(); // Clean up after rendering
```

---

## Compatibility

- MobX **6.x**
- SolidJS **1.6+**
- TypeScript **5.x**
- SSR / Hydration

---

## License

MIT © [Sergey Volkov](https://github.com/js2me)

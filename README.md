# mobx-solid

MobX bindings for [SolidJS](https://www.solidjs.com/) — reactive state management with fine-grained UI updates.

# [Read docs →](https://js2me.github.io/mobx-solid)

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

## License

MIT

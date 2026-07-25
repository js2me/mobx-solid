import { autorun } from "mobx";
import { createSignal, onCleanup, type Accessor, type SignalOptions } from "solid-js";

const NO_EQUALS: SignalOptions<unknown> = { equals: false };

/**
 * Converts a MobX observable expression into a SolidJS signal accessor.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/obs)
 */
export function obs<T>(getter: () => T): Accessor<T> {
  const [value, setValue] = createSignal<T>(undefined as unknown as T, NO_EQUALS);

  const dispose = autorun(() => {
    setValue(getter);
  });

  onCleanup(dispose);

  return value;
}

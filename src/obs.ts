import { autorun } from "mobx";
import { createSignal, onCleanup, type Accessor } from "solid-js";

/**
 * Converts a MobX observable expression into a SolidJS signal accessor.
 *
 * [**Documentation**](https://js2me.github.io/mobx-solid/api/obs)
 */
export function obs<T>(getter: () => T): Accessor<T> {
  const [value, setValue] = createSignal<T>(undefined as unknown as T, {
    equals: false,
  });

  const dispose = autorun(() => {
    setValue(getter);
  });

  onCleanup(dispose);

  return value;
}

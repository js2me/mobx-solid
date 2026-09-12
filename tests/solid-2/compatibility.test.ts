import { describe, expect, it } from "vitest";
import * as solid from "solid-js";
import { action, observable } from "mobx";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";

describe.skipIf(typeof (solid as { createResource?: unknown }).createResource !== "undefined")(
  "SolidJS 2 compatibility",
  () => {
  it("runs against the SolidJS 2 external-source API", () => {
    expect(typeof (solid as { createResource?: unknown }).createResource).toBe(
      "undefined",
    );

    enableObservableTracking();
  });

  it("tracks MobX observables in createEffect", () => {
    enableObservableTracking();
    const store = observable({ count: 0 });
    const values: number[] = [];

    solid.createRoot((dispose) => {
      solid.createEffect(
        () => store.count,
        (value) => {
          values.push(value);
        },
      );
      solid.flush();

      expect(values).toEqual([0]);
      action(() => {
        store.count = 1;
      })();
      solid.flush();
      expect(values).toEqual([0, 1]);

      dispose();
    });

    action(() => {
      store.count = 2;
    })();
    expect(values).toEqual([0, 1]);
  });

  it("tracks MobX observables in createMemo", () => {
    enableObservableTracking();
    const store = observable({ first: "Ada", last: "Lovelace" });
    let fullName: (() => string) | undefined;

    solid.createRoot((dispose) => {
      fullName = solid.createMemo(() => `${store.first} ${store.last}`);

      expect(fullName!()).toBe("Ada Lovelace");
      action(() => {
        store.last = "Byron";
      })();
      solid.flush();
      expect(fullName!()).toBe("Ada Byron");

      dispose();
    });
  });

  it("keeps obs() reactive and disposes its MobX reaction", () => {
    const store = observable({ count: 0 });
    let dispose: (() => void) | undefined;
    let count: (() => number) | undefined;
    const values: number[] = [];

    solid.createRoot((rootDispose) => {
      dispose = rootDispose;
      count = obs(() => store.count);
      solid.createEffect(
        () => count!(),
        (value) => {
          values.push(value);
        },
      );
      solid.flush();
    });

    expect(values).toEqual([0]);
    action(() => {
      store.count = 1;
    })();
    solid.flush();
    expect(values).toEqual([0, 1]);

    dispose!();
    action(() => {
      store.count = 2;
    })();
    solid.flush();
    expect(values).toEqual([0, 1]);
  });
  },
);

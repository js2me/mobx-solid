import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { observable, action } from "mobx";
import { Show, createSignal } from "solid-js";
import { render, cleanup } from "@solidjs/testing-library";
import { enableObservableTracking } from "../../src/enable-observable-tracking";
import { obs } from "../../src/obs";

/**
 * FIXED: obs() called inline in JSX expression no longer causes infinite loop.
 *
 * Root cause: obs() used `autorun` + `createSignal({ equals: false })`. The
 * autorun ran immediately and wrote the signal, triggering a Solid update.
 * When obs() was called inside a reactive computation (JSX expression), the
 * update caused re-evaluation → new obs() → new write → another update → ∞.
 *
 * Fix: obs() now reads the getter upfront (inside `untrack`) for the initial
 * value, and uses `reaction` (with `fireImmediately: false`) instead of
 * `autorun`. The reaction's data function runs immediately to establish MobX
 * tracking, but the effect (which writes the signal) is NOT called on the
 * first run. This eliminates the initial equals:false notification that
 * caused the infinite loop.
 *
 * Side effects of the fix:
 * - obs() signal starts with the correct value (not undefined) — the
 *   stale-snapshot bug is also fixed.
 * - obs() getter that throws on initial call now throws immediately from
 *   obs() itself (fail-fast), instead of silently creating a broken accessor.
 * - The `equals: () => false` reaction option ensures updates are always
 *   triggered on subsequent MobX changes, including reference-equal arrays.
 */
describe("FIXED: obs() inline in JSX — no infinite loop", () => {
  beforeEach(() => {
    enableObservableTracking();
  });

  afterEach(() => {
    cleanup();
  });

  it("obs() inline in JSX expression renders without infinite loop", () => {
    const store = observable({ visible: true });

    // Previously: obs() inline in JSX caused RangeError (stack overflow).
    // Now: the initial signal value is set from getter() (inside untrack),
    // and reaction (fireImmediately: false) doesn't write the signal on the
    // first run — no initial update notification, no infinite loop.
    const View = () => (
      <span data-testid="v">{String(obs(() => store.visible)())}</span>
    );

    const { getByTestId } = render(() => <View />);
    expect(getByTestId("v").textContent).toBe("true");
  });

  it("obs() inline in JSX inside Show content renders without infinite loop", () => {
    const store = observable({ visible: true, count: 0 });
    const [toggle, setToggle] = createSignal(true);

    const View = () => {
      const visible = obs(() => store.visible);
      return (
        <Show when={toggle() && visible()}>
          <span data-testid="v">
            {String(obs(() => store.visible)())}:{obs(() => store.count)()}
          </span>
        </Show>
      );
    };

    const { getByTestId } = render(() => <View />);
    expect(getByTestId("v").textContent).toBe("true:0");

    // Mutations propagate correctly through inline obs()
    action(() => { store.count = 5; })();
    expect(getByTestId("v").textContent).toBe("true:5");

    action(() => { store.visible = false; })();
    // Show hides — obs() inside content disposed
    // Show fallback not used here, so content just disappears
  });
});

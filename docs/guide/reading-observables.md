# Reading Observables

SolidJS component bodies run **once**. Values captured outside JSX or Solid reactive primitives are not tracked and will go stale.

## Correct patterns

```tsx
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

## Incorrect pattern

```tsx
// ❌ Stale — body runs once
function Bad() {
  const n = store.count;
  return <div>{n}</div>;
}
```

## Rule of thumb

Read MobX observables:

- inside JSX expressions, or
- inside Solid reactive primitives (`createEffect`, `createMemo`, …)

Do not read them once in the component body and reuse the snapshot later unless that is intentional.

## Without global tracking

:::danger Deprecated
`obs()` is deprecated and will be removed in the first release. Prefer calling `enableObservableTracking()` at your app entry point.
:::

If you have not called `enableObservableTracking()`, use [`obs`](/api/obs) to turn a MobX expression into a Solid accessor:

```tsx
const count = obs(() => store.count);

function Counter() {
  return <div>{count()}</div>;
}
```

When global tracking is already enabled, you usually do not need `obs` — read observables directly in JSX and Solid computations.

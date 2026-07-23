# How It Works

SolidJS exposes `enableExternalSource(factory, untrack)` as the official hook for integrating external reactive systems. **mobx-solid** uses it to keep MobX and Solid in sync.

## Bridge overview

1. `enableObservableTracking()` registers a factory that creates a MobX `Reaction` for each SolidJS computation.
2. The reaction’s `track` method runs the computation inside MobX’s tracking context.
3. When a MobX observable changes, the reaction calls Solid’s `trigger`, so the computation re-evaluates.
4. When a Solid scope is disposed, the MobX reaction is disposed as well.

```
MobX observable changes
        │
        ▼
  MobX Reaction ──trigger──▶ Solid re-evaluates computation
        │
        ▼
  MobX re-tracks dependencies on the next run
```

## What gets tracked

After `enableObservableTracking()`:

- Solid computations (`createEffect`, `createMemo`, `createComputed`, `createRenderEffect`) and JSX expressions track MobX observables automatically
- Affected Solid computations re-run when those observables change
- MobX reactions are cleaned up when Solid scopes dispose

No HOC or wrapper components are required — read MobX state directly where Solid is reactive.

## Cleanup

Disposal is paired: Solid owns the lifetime of each computation, and the bridge disposes the matching MobX `Reaction` when that computation goes away. You do not need to call MobX `dispose` yourself for these bridged reactions.

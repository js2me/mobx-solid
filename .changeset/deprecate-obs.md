---
"mobx-solid": minor
---

Mark `obs()` as deprecated. Prefer `enableObservableTracking()`, which makes all MobX reads reactive inside Solid computations and JSX, making `obs()` unnecessary. `obs()` will be removed in the first release.

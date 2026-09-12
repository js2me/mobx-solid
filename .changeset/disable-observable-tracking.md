---
"mobx-solid": minor
---

Add `disableObservableTracking()` to turn the MobX → SolidJS bridge off: it disposes every live bridged reaction and stops MobX-driven recomputations, which is useful after SSR renders and in tests. Re-enabling with `enableObservableTracking()` stays safe — Solid's external source is registered only once per realm.

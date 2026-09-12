# mobx-solid

## 0.3.0

### Minor Changes

- [`dce5fbe`](https://github.com/js2me/mobx-solid/commit/dce5fbee7695feece0fdfea15e22a0e3871fab0e) Thanks [@js2me](https://github.com/js2me)! - Add `disableObservableTracking()` to turn the MobX → SolidJS bridge off: it disposes every live bridged reaction and stops MobX-driven recomputations, which is useful after SSR renders and in tests. Re-enabling with `enableObservableTracking()` stays safe — Solid's external source is registered only once per realm.

### Patch Changes

- [`e212b66`](https://github.com/js2me/mobx-solid/commit/e212b6621b2a74541898800950acec6020549f9c) Thanks [@js2me](https://github.com/js2me)! - Fix consumer builds against SolidJS 2 failing with `No matching export ... for import "createResource"`: the SolidJS 1 marker is now read via `Reflect.get`, so bundlers no longer resolve the removed export statically.

- [`c73d24b`](https://github.com/js2me/mobx-solid/commit/c73d24b667fa0be3212943a66ffc5a96011e67b1) Thanks [@js2me](https://github.com/js2me)! - Share the observable tracking initialization state through `globalThis` so multiple bundled copies do not register the SolidJS external source more than once.

- [`3c0821b`](https://github.com/js2me/mobx-solid/commit/3c0821bca6e62a3f66b0f7efad4a579f4d62d766) Thanks [@js2me](https://github.com/js2me)! - Keep SolidJS 2 compatibility tests alongside the existing SolidJS 1 test suite and support the SolidJS 2 external-source API without importing removed SolidJS 1 exports.

## 0.2.0

### Minor Changes

- [`7e2176e`](https://github.com/js2me/mobx-solid/commit/7e2176e4a0cde0540bf6229ca83a4613e993ebc9) Thanks [@js2me](https://github.com/js2me)! - add support for solid-js 2.x.x (enableObservableTracking api)

## 0.1.0

### Minor Changes

- [`8d47aa0`](https://github.com/js2me/mobx-solid/commit/8d47aa0e0e5490379996e9e80b8089735ace53f5) Thanks [@js2me](https://github.com/js2me)! - Mark `obs()` as deprecated. Prefer `enableObservableTracking()`, which makes all MobX reads reactive inside Solid computations and JSX, making `obs()` unnecessary. `obs()` will be removed in the first release.

## 0.0.3

### Patch Changes

- [`e000655`](https://github.com/js2me/mobx-solid/commit/e000655a55895a635c434575f156329381a13066) Thanks [@js2me](https://github.com/js2me)! - fixed SSR for obs function, add more unit tests, fix bug with zombie obs subs

- [`72e6ad3`](https://github.com/js2me/mobx-solid/commit/72e6ad340bb70ebc0973327debb2a773c39bce40) Thanks [@js2me](https://github.com/js2me)! - small refactorings (optimize code)

## 0.0.2

### Patch Changes

- [`9c3e229`](https://github.com/js2me/mobx-solid/commit/9c3e2293b7b95eee71ddb0cf0e8a9808447e5bb0) Thanks [@js2me](https://github.com/js2me)! - update docs

## 0.0.1

### Patch Changes

- [`a924b84`](https://github.com/js2me/mobx-solid/commit/a924b842b19a72017b7c5813dd69e3864cfd2514) Thanks [@js2me](https://github.com/js2me)! - first draft version with enableObservableTracking + obs utils only

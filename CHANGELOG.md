# mobx-solid

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

---
"mobx-solid": patch
---

Keep tree-shaking intact: drop the `import *` namespace and the `Reflect.get` version marker — a single callable argument carrying `factory`/`untrack` fields now satisfies both the SolidJS 1 (positional) and SolidJS 2 (config object) `enableExternalSource` signatures, with no references to removed exports.

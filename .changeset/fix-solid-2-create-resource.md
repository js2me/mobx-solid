---
"mobx-solid": patch
---

Fix consumer builds against SolidJS 2 failing with `No matching export ... for import "createResource"`: the SolidJS 1 marker is now read via `Reflect.get`, so bundlers no longer resolve the removed export statically.

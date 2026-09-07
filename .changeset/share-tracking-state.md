---
"mobx-solid": patch
---

Share the observable tracking initialization state through `globalThis` so multiple bundled copies do not register the SolidJS external source more than once.

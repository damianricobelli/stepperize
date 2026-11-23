---
"@stepperize/core": minor
---

Add `@stepperize/core/primitives`, for binding authors: the ids, ARIA and `data-*` attributes, keyboard navigation, focus hand-off and announcements that every binding's primitives share. The focus hand-off resolves ids and focus in the shadow root a stepper is rendered in, and treats a focused element inside a hidden panel, or inside the leaving panel of another step, as lost.

`development()` tells whether development checks run; published files loaded without a bundler (no `process`) skip them instead of failing. New diagnostic codes: SZ004 (a part rendered in another shadow root than its root), SZ005 (a trigger that is not a button) and SZ104 (a flow created where nothing owns it).

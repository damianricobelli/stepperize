---
"@stepperize/vue": minor
"@stepperize/core": minor
---

Add `@stepperize/vue`, the Vue 3 binding.

`defineStepper(steps, options)` returns the same definition as in React, in Vue's terms: `useStepper()` for a flow owned by the component, `useStepperContext(selector?)` and `Provider` to share one, `create()` to run it without Vue, and the accessible, unstyled `Stepper.*` primitives (`Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`). Step ids are typed in templates and TSX, it renders on the server and hydrates without changing the HTML, and `@stepperize/vue/headless` leaves the primitives out.

`@stepperize/core` gains a `@stepperize/core/primitives` entry for binding authors: the ids, ARIA and data attributes, keyboard navigation, focus hand-off and announcements that every binding's primitives share.

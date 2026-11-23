---
"@stepperize/svelte": minor
---

Add `@stepperize/svelte`, the Svelte 5 binding.

`defineStepper(steps, options)` returns the same definition as in React, in Svelte's terms: `useStepper()` for a flow owned by the component, as a reactive object that markup, `$derived` and `$effect` follow; `Provider` and `useStepperContext()` to share one; `create()` to run it without Svelte, and `fromFlow()` to read such a flow reactively from a `.svelte.ts` module, with no component; and the accessible, unstyled `Stepper.*` primitives (`Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`), with snippets for the stepper, each step and your own elements (their `props` typed), a bindable `ref` on every one and your attachments passed to the element. Step ids are typed in markup, it renders on the server and hydrates in place, and `@stepperize/svelte/headless` leaves the primitives out.

Requires Svelte 5.33.5 or newer: before it, Svelte re-runs your attachments on a part whenever another of its attributes changes.

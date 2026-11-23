---
"@stepperize/vue": minor
---

Add `@stepperize/vue`, the Vue 3 binding. It replaces the 2.x API of this package with the design every binding now shares; there is no compatibility layer.

`defineStepper(steps, options)` returns the same definition as in React, in Vue's terms: `useStepper()` for a flow owned by the component, `useStepperContext(selector?)` and `Provider` to share one, `create()` to run it without Vue, and the accessible, unstyled `Stepper.*` primitives (`Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`). Step ids are typed in templates and TSX, it renders on the server and hydrates without changing the HTML, and `@stepperize/vue/headless` leaves the primitives out.

The stepper is a reactive, read-only view (`Readonly<Stepper<S>>`): templates, `computed` and watched getters follow it, `reactive()`, `ref()` and Pinia stores keep it as it is, and an option changed in the same tick as an action is applied before the action. Under `<KeepAlive>` a cached component stops following `step` until it is shown again, and in development a flow that nothing owns (after an `await` in a hand-written async setup) warns.

The primitives work inside `<Transition>` in every mode: with `out-in`, focus and the announcement wait for the new panel. `as-child` fills an empty child with the primitive's content (the title, a List's items) and warns in development when the props are lost (several children, or a component that does not pass its attributes on). In TSX, `v-slots` types every slot. `Primitives<S>` and `StepperComponent` are exported.

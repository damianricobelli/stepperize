---
"@stepperize/solid": minor
---

Add `@stepperize/solid`, the Solid binding.

`defineStepper(steps, options)` returns the same definition as in React, in Solid's terms: `useStepper()` for a flow owned by the component, as a reactive object that JSX, memos and effects follow like props; `Provider` and `useStepperContext(selector?)` to share one; `create()` to run it without Solid; and the accessible, unstyled `Stepper.*` primitives (`Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`), with function children for the stepper, each step and each item, and `as` for your own elements. Step ids are typed, it renders on the server and hydrates in place, and `@stepperize/solid/headless` leaves the primitives out.

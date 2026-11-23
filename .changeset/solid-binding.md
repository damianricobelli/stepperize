---
"@stepperize/solid": minor
---

Add `@stepperize/solid`, the Solid binding.

`defineStepper(steps, options)` returns the same definition as in React, in Solid's terms: `useStepper()` for a flow owned by the component, as a reactive object that JSX, memos and effects follow like props; `Provider` and `useStepperContext(selector?)` to share one; `create()` to run it without Solid; and the accessible, unstyled `Stepper.*` primitives (`Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`), with function children for the stepper, each step and each item (a function declares its parameter, as in `<Show>`, so `<For>` works inside a `List`), and a polymorphic `as` whose props and `ref` follow the tag or component it renders. Callbacks are read when the flow calls them, so the latest one always runs. Step ids are typed, it renders on the server (including `renderToStringAsync` and `renderToStream`) and hydrates in place, and `@stepperize/solid/headless` leaves the primitives out.

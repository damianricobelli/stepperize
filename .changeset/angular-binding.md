---
"@stepperize/angular": minor
---

Add `@stepperize/angular`, the Angular binding.

`defineStepper(steps, options)` returns a signals API: `injectStepper()` gives the calling component, directive or service a flow of its own as a signal of the current stepper, destroyed with its owner; `provideStepper()` and `injectStepperContext()` share one flow with a component and everything below it; `create()` runs it without Angular. Options can be a function, read again when the signals it uses change, so `step` can follow the router. The accessible primitives are standalone attribute directives (`stepperRoot`, `stepperList`, `stepperItem`, `stepperTrigger`, `stepperIndicator`, `stepperContent`, `stepperPrev`, `stepperNext`) with host bindings for roles, ids and `data-*` attributes. It works zoneless, renders on the server with the roles already in the HTML, and hydrates in place. `@stepperize/angular/headless` is the signals API without the directives. Requires Angular 22.

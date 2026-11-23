# @stepperize/angular

## 9.1.0

### Minor Changes

- [#186](https://github.com/damianricobelli/stepperize/pull/186) [`5c5f923`](https://github.com/damianricobelli/stepperize/commit/5c5f923d3b3177617a9cffa0c7c9f67ea3f8650d) Thanks [@damianricobelli](https://github.com/damianricobelli)! - Add `@stepperize/angular`, the Angular binding.
  
  `defineStepper(steps, options)` returns a signals API: `injectStepper()` gives the calling component, directive or service a flow of its own as a signal of the current stepper, destroyed with its owner; `provideStepper()` and `injectStepperContext()` share one flow with a component and everything below it; `create()` runs it without Angular. Options can be a function, read again when the signals it uses change, so `step` can follow the router. Callbacks and the guard are read when the flow calls them, so the latest ones run even when changed in the same tick; `linear` applies before the next render, on the server too, and `step` is followed in the browser only.
  
  The accessible primitives are standalone attribute directives (`stepperRoot`, `stepperList`, `stepperItem`, `stepperTrigger`, `stepperIndicator`, `stepperContent`, `stepperPrev`, `stepperNext`) with host bindings for roles, ids and `data-*` attributes. `stepperRoot` shares its stepper with `injectStepperContext()`. Static attributes you write on the root, list, items, panels and indicators win; triggers and buttons keep your `type`. Step ids in templates are checked by the template type-checker once you register your definitions in `StepperRegistry`, and `[stepperItem]="step"` types that step's fields in `item.value()`. Each part re-renders only when what it shows changes. Panels stay in the page with `hidden` and `display: none`; `#panel="stepperContent"` with `@if (panel.active())` or `@defer` leaves their content out. A part acts after every `(click)` on its element, so `preventDefault()` takes over and `stopPropagation()` does not get in the way.
  
  It works zoneless, renders on the server with the roles already in the HTML, hydrates in place, replays clicks made before hydration, and keeps the tablist while its triggers wait in an `@defer (hydrate …)` block. `@stepperize/angular/headless` is the signals API without the directives. Requires Angular 22.

### Patch Changes

- Updated dependencies [[`796b429`](https://github.com/damianricobelli/stepperize/commit/796b429ccfd78e0485ee9736a5c20872f66c9b50), [`0b64c52`](https://github.com/damianricobelli/stepperize/commit/0b64c5239974db080dead149a1a72120943f6cda), [`81e5774`](https://github.com/damianricobelli/stepperize/commit/81e57740c4a4b0e206c44bf75c230ba6b2a35a41)]:
  - @stepperize/core@9.1.0

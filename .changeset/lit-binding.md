---
"@stepperize/lit": minor
"@stepperize/core": patch
---

Add `@stepperize/lit`, the Lit binding.

`defineStepper(steps, options)` returns `controller(host, options)`: a `ReactiveController` that updates the host whenever the flow changes and stops when the host is disconnected. Options can be a function, read again on every update of the host, so callbacks and `step` follow the element's properties. The controller also carries the accessible primitives as element directives (`root`, `list`, `item`, `trigger`, `indicator`, `content`, `prev`, `next`) that put roles, ids, `data-*` attributes and handlers on the elements of your own template, in shadow or light DOM, with step ids typed by the definition. `@stepperize/lit/headless` is the controller without the directives.

`@stepperize/core/primitives`: focus hand-off and announcements now resolve ids and focus in the shadow root a stepper is rendered in, and treat a focused element inside a `hidden` panel as lost.

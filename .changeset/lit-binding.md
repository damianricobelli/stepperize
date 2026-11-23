---
"@stepperize/lit": minor
---

Add `@stepperize/lit`, the Lit binding.

`defineStepper(steps, options)` returns `controller(host, source)`: a `ReactiveController` that updates the host whenever the flow changes and stops when the host is disconnected. The source is options for a flow the host owns, or a flow to follow; either can be a function, read once before every render, so callbacks and `step` follow the element's properties (a move `step` causes is in the same render) and a followed flow can arrive late or change, as one from `@lit/context` does. `destroy()` ends a controller, and the flow it owns.

The controller also carries the accessible primitives as element directives (`root`, `list`, `item`, `trigger`, `indicator`, `content`, `prev`, `next`) that put roles, ids, `data-*` attributes and handlers on the elements of your own template, in shadow or light DOM, with step ids typed by the definition. They never remove an attribute they did not set: your `role`, name and `tabindex` win on the structure, your `type` on buttons, and your `disabled` and `hidden` add to the flow's. Parts rendered later (`until`, a child component in its own shadow root) are painted as soon as their template is in place. `at(id)` returns a step's state with the step typed by its id. `@stepperize/lit/headless` is the controller without the directives.

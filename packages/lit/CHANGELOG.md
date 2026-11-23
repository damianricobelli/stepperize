# @stepperize/lit

## 9.1.0

### Minor Changes

- [#186](https://github.com/damianricobelli/stepperize/pull/186) [`7e8d7fe`](https://github.com/damianricobelli/stepperize/commit/7e8d7fe6434fe971264eb82571ecb3e7c6e54e7c) Thanks [@damianricobelli](https://github.com/damianricobelli)! - Add `@stepperize/lit`, the Lit binding.
  
  `defineStepper(steps, options)` returns `controller(host, source)`: a `ReactiveController` that updates the host whenever the flow changes and stops when the host is disconnected. The source is options for a flow the host owns, or a flow to follow; either can be a function, read once before every render, so callbacks and `step` follow the element's properties (a move `step` causes is in the same render) and a followed flow can arrive late or change, as one from `@lit/context` does. `destroy()` ends a controller, and the flow it owns.
  
  The controller also carries the accessible primitives as element directives (`root`, `list`, `item`, `trigger`, `indicator`, `content`, `prev`, `next`) that put roles, ids, `data-*` attributes and handlers on the elements of your own template, in shadow or light DOM, with step ids typed by the definition. They never remove an attribute they did not set: your `role`, name and `tabindex` win on the structure, your `type` on buttons, and your `disabled` and `hidden` add to the flow's. Parts rendered later (`until`, a child component in its own shadow root) are painted as soon as their template is in place. `at(id)` returns a step's state with the step typed by its id. `@stepperize/lit/headless` is the controller without the directives.

### Patch Changes

- Updated dependencies [[`796b429`](https://github.com/damianricobelli/stepperize/commit/796b429ccfd78e0485ee9736a5c20872f66c9b50), [`0b64c52`](https://github.com/damianricobelli/stepperize/commit/0b64c5239974db080dead149a1a72120943f6cda), [`81e5774`](https://github.com/damianricobelli/stepperize/commit/81e57740c4a4b0e206c44bf75c230ba6b2a35a41)]:
  - @stepperize/core@9.1.0

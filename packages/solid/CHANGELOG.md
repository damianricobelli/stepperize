# @stepperize/solid

## 9.1.0

### Minor Changes

- [#186](https://github.com/damianricobelli/stepperize/pull/186) [`9dec3fe`](https://github.com/damianricobelli/stepperize/commit/9dec3fec2b24efd4d2b296a94ba644eb15c715fc) Thanks [@damianricobelli](https://github.com/damianricobelli)! - Add `@stepperize/solid`, the Solid binding. It replaces the 1.x API of this package with the design every binding now shares; there is no compatibility layer.
  
  `defineStepper(steps, options)` returns the same definition as in React, in Solid's terms: `useStepper()` for a flow owned by the component, as a reactive object that JSX, memos and effects follow like props; `Provider` and `useStepperContext(selector?)` to share one; `create()` to run it without Solid; and the accessible, unstyled `Stepper.*` primitives (`Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`), with function children for the stepper, each step and each item (a function declares its parameter, as in `<Show>`, so `<For>` works inside a `List`), and a polymorphic `as` whose props and `ref` follow the tag or component it renders. Callbacks are read when the flow calls them, so the latest one always runs. Step ids are typed, it renders on the server (including `renderToStringAsync` and `renderToStream`) and hydrates in place, and `@stepperize/solid/headless` leaves the primitives out.

### Patch Changes

- Updated dependencies [[`796b429`](https://github.com/damianricobelli/stepperize/commit/796b429ccfd78e0485ee9736a5c20872f66c9b50), [`0b64c52`](https://github.com/damianricobelli/stepperize/commit/0b64c5239974db080dead149a1a72120943f6cda), [`81e5774`](https://github.com/damianricobelli/stepperize/commit/81e57740c4a4b0e206c44bf75c230ba6b2a35a41)]:
  - @stepperize/core@9.1.0

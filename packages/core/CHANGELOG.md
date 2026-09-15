# @stepperize/core

## 4.0.0

### Major Changes

- [#174](https://github.com/damianricobelli/stepperize/pull/174) [`47fe95d`](https://github.com/damianricobelli/stepperize/commit/47fe95d99890918214079d72d7c992f2ab44d2d3) Thanks [@damianricobelli](https://github.com/damianricobelli)! - Release Stepperize v8 with explicit state ownership, selector subscriptions and reliable navigation.
  
  ### Breaking changes
  
  - `useStepper()` always creates an independent local instance. Replace shared consumers with `useStepperContext(selector?, isEqual?)` under the matching `Provider` or `Stepper.Root`.
  - Navigation returns `NavigationResult` instead of a boolean. Check `result.accepted`; rejected requests expose `guard`, `policy`, `pending`, `boundary`, `same-step`, `invalid-step` or `cancelled` as their reason.
  - `goTo()` respects linear navigation policy. Pass `bypassPolicy: true` for intentional branches; guards still run.
  - `reset()` restores the mount-time step, data and completion. Use `keepData` and `keepCompleted` to preserve either value.
  - React 18 or 19 is required. `createStepperPrimitives` is internal; use the primitives returned by `defineStepper()`.
  - Update the shared core types for navigation results, reset options, policy bypass and cancellable step-change contexts.
  
  ### Added
  
  - Add `@stepperize/react/headless` for hooks, Provider and state management without UI primitives.
  - Support atomic source-step data and completion when navigation is accepted through `next(options)`, `prev(options)` and `goTo(id, options)`.
  - Add `defaultCompleted`, typed functional `data.update` and typed step data in `match` handlers.
  - Add selector equality, isolated nested scopes and cancellation through `context.signal`.
  - Add `Content forceMount`, explicit completion attributes and instance-scoped accessible IDs.
  
  ### Fixed and improved
  
  - Prevent duplicate navigation, lost compound writes and stale async transitions after cancellation or unmount.
  - Keep controlled state and callbacks current in child effects, cache selector snapshots and preserve abandoned-render isolation.
  - Fix trigger button defaults inside forms and inherited orientation.
  - Cache immutable step indexes, reuse unchanged snapshots and helpers, and reduce unnecessary subscriber renders.
  - Add 21 reproducible production React browser benchmarks with raw samples, source hashes and documented regressions.
  
  ### Documentation and validation
  
  - Preserve the v7 documentation and add v8 API references, migration guidance, navigation failure reasons and interactive examples.
  - Update form integrations, registry blocks, version navigation, search and AI-readable documentation.
  - Run React and interactive example tests in Chromium, with React 18/19 compatibility jobs and public export, SSR and headless bundle checks.
  
  See the [v8 migration guide](https://stepperize.com/docs/v8/migration/v8) for upgrade examples.

## 3.0.0

### Major Changes

- [#172](https://github.com/damianricobelli/stepperize/pull/172) [`dcdd284`](https://github.com/damianricobelli/stepperize/commit/dcdd2847422d7a388b71f7a431ad17c64e0035da) Thanks [@damianricobelli](https://github.com/damianricobelli)! - breaking(v7): release Stepperize v7

## 2.1.0

### Minor Changes

- [#167](https://github.com/damianricobelli/stepperize/pull/167) [`bcda7f3`](https://github.com/damianricobelli/stepperize/commit/bcda7f3c683a67320c13cbfec1faf2fdbd455e87) Thanks [@damianricobelli](https://github.com/damianricobelli)! - feat: enhance stepper lifecycle with multiple callbacks and metadata

## 2.0.0

### Major Changes

- [#165](https://github.com/damianricobelli/stepperize/pull/165) [`515a9e5`](https://github.com/damianricobelli/stepperize/commit/515a9e528cdede71851860b125f9bf12a1fe1663) Thanks [@damianricobelli](https://github.com/damianricobelli)! - Stepperize v6

## 1.2.7

### Patch Changes

- [#147](https://github.com/damianricobelli/stepperize/pull/147) [`9c01f9e`](https://github.com/damianricobelli/stepperize/commit/9c01f9ebe38fea2ea69bf7216977327503945a81) Thanks [@damianricobelli](https://github.com/damianricobelli)! - chore: add tests for core and react packages

## 1.2.6

### Patch Changes

- [#131](https://github.com/damianricobelli/stepperize/pull/131) [`095f052`](https://github.com/damianricobelli/stepperize/commit/095f0525140b239f149478c548ea3f534ec014f2) Thanks [@damianricobelli](https://github.com/damianricobelli)! - core: fix match issue

## 1.2.5

### Patch Changes

- [`5fdf934`](https://github.com/damianricobelli/stepperize/commit/5fdf9344f38a8673220adbc57f8ea55489883563) Thanks [@damianricobelli](https://github.com/damianricobelli)! - Add main entry point

## 1.2.4

### Patch Changes

- [#119](https://github.com/damianricobelli/stepperize/pull/119) [`921bb62`](https://github.com/damianricobelli/stepperize/commit/921bb6297a0f370fbe5cbf4689b5a698207ee62c) Thanks [@longzheng](https://github.com/longzheng)! - Update package.json `types` to match filename

## 1.2.3

### Patch Changes

- [#115](https://github.com/damianricobelli/stepperize/pull/115) [`a51614f`](https://github.com/damianricobelli/stepperize/commit/a51614f802b5d0f9e1a0d4936166d3d56b01692b) Thanks [@damianricobelli](https://github.com/damianricobelli)! - fix: peer deps

## 1.2.2

### Patch Changes

- [#113](https://github.com/damianricobelli/stepperize/pull/113) [`788ee09`](https://github.com/damianricobelli/stepperize/commit/788ee0956b3dda7965f37e1483b29b2c7a9b8fc4) Thanks [@damianricobelli](https://github.com/damianricobelli)! - feat: add solid js support, improve package configurations and fix match method

## 1.2.1

### Patch Changes

- [#111](https://github.com/damianricobelli/stepperize/pull/111) [`5acc49b`](https://github.com/damianricobelli/stepperize/commit/5acc49b4387d38d3cf0d8c7d192f36ae44860f66) Thanks [@damianricobelli](https://github.com/damianricobelli)! - Update docs

## 1.2.0

### Minor Changes

- [#107](https://github.com/damianricobelli/stepperize/pull/107) [`8360286`](https://github.com/damianricobelli/stepperize/commit/83602861e8b21ef7c9943356ed93e37044e5b145) Thanks [@damianricobelli](https://github.com/damianricobelli)! - Add before and after go to feature

## 1.1.1

### Patch Changes

- [#101](https://github.com/damianricobelli/stepperize/pull/101) [`ac936a5`](https://github.com/damianricobelli/stepperize/commit/ac936a5eecfc3eed959ce83ab45045868ed2e197) Thanks [@damianricobelli](https://github.com/damianricobelli)! - stepperize/react v5

## 1.1.0

### Minor Changes

- [#98](https://github.com/damianricobelli/stepperize/pull/98) [`086e074`](https://github.com/damianricobelli/stepperize/commit/086e074ad39c731229910daa26e6ed099ddb923a) Thanks [@damianricobelli](https://github.com/damianricobelli)! - feat: new before/next functions

## 1.0.0

### Major Changes

- [#88](https://github.com/damianricobelli/stepperize/pull/88) [`46591cc`](https://github.com/damianricobelli/stepperize/commit/46591cc7aabf6d2730cf8296166792a4c33c2d2b) Thanks [@damianricobelli](https://github.com/damianricobelli)! - chore: update package json

## 1.0.0

### Major Changes

- [#29](https://github.com/damianricobelli/stepperize/pull/29) [`f1ce841`](https://github.com/damianricobelli/stepperize/commit/f1ce841411844be787339e269de1a9003ebe715b) Thanks [@alexzhang1030](https://github.com/alexzhang1030)! - refactor: extract common logic to @stepprize/core

### Patch Changes

- [#85](https://github.com/damianricobelli/stepperize/pull/85) [`752f9a6`](https://github.com/damianricobelli/stepperize/commit/752f9a6907cc5e7e623a66350c82eeba9559fea7) Thanks [@damianricobelli](https://github.com/damianricobelli)! - chore: lint and fix ci

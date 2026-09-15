---
"@stepperize/react": major
"@stepperize/core": major
---

Release Stepperize v8 with explicit state ownership, selector subscriptions and reliable navigation.

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

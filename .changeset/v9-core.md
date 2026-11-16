---
"@stepperize/core": major
"@stepperize/react": major
---

A smaller API on a framework-free core.

- **One state machine, with or without React.** `@stepperize/core` now holds the whole flow (`createStepper`). `definition.create()` runs it in tests, servers and agents; `useStepper()` and `Stepper.Root` are thin bindings over it.
- **`next()` validates.** It saves the data you pass, checks it against the step's schema, completes the step and moves on. On the last step it finishes the flow (`onFinish`, `to: null`). No guard to write for validation. `validate(id?)` checks a step without moving.
- **Input and output are separate.** `data` holds every step as it was typed; `output` holds what each complete step's schema produced, with transforms and defaults applied. `onFinish(output, data)` receives both.
- **Finishing happens once.** `isFinished` says the flow is done, and a second `next()` is refused with `"finished"` instead of submitting twice. Return a promise from `onFinish` and the flow stays pending until it settles; if it rejects, the user can try again.
- **Completion follows the data.** Editing a complete step makes it pending again; in a `linear` flow so are the steps completed after it, so none is skipped.
- **Declarative branching.** `next: { account: (data) => (data.type === "team" ? "team" : "payment") }`, typed from each step's schema. `prev()` returns along the path taken. A `null` entry ends the flow at that step, so a flow can have more than one ending. Branches also receive the data of every step, for decisions that depend on an earlier answer.
- **One state per step**: `pending`, `current` or `complete`, plus `issues(id)`. Replaces `status()`, `isComplete()` and `setComplete()`.
- **Snapshots instead of controlled props.** `snapshot()`, `restore()`, the `snapshot` option and a single `onChange` replace `data`/`completed`, their defaults and their callbacks.
- **The URL in one option.** `step` makes the flow follow an outside value. `linear` and the guard still apply, so a deep link cannot skip validation; when the flow cannot follow, `onInvalidStep` reports where it really is. Replaces `step` + `onStepChange`.
- **`isLast` knows about branches**: it is `true` when `next()` would finish the flow.
- **Selectors can return objects.** `useStepperContext((s) => ({ ... }))` no longer needs an `isEqual` argument to be safe.
- **Automatic ARIA pattern.** A `linear` flow renders an ordered list of steps with `aria-current="step"`; a free flow renders tabs.
- **Fewer primitives**: `Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`. `Stepper.List` takes a function child instead of `Stepper.Items`; `Title` and `Description` are always a `span`; `Actions` and `Separator` are gone.
- **Smaller**: 5.2 kB with primitives (was 5.4) and 2.6 kB for the hooks only (was 3.6), min + gzip.

Removed from the instance: `id`, `count`, `completed`, `canPrev`, `canNext`, `is`, `status`, `isComplete`, `setComplete` and the `data.*` methods (use `data`, `setData`, `current`, `index` and `state`). Removed entries and helpers: `@stepperize/react/primitives`, `definition.get`, `at`, `parseStep`, `validate`, and the utilities exported by `@stepperize/core`.

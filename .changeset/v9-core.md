---
"@stepperize/core": major
"@stepperize/react": major
---

A smaller API on a framework-free core.

- **One state machine, with or without React.** `@stepperize/core` now holds the whole flow (`createStepper`). `definition.create()` runs it in tests, servers and agents; `useStepper()` and `Stepper.Root` are thin bindings over it.
- **`next()` validates.** It saves the data you pass, checks it against the step's schema, completes the step and moves on. On the last step it finishes the flow (`onFinish`, `to: null`). No guard to write for validation.
- **Declarative branching.** `next: { account: (data) => (data.type === "team" ? "team" : "payment") }`, typed from each step's schema. `prev()` returns along the path taken.
- **One state per step**: `pending`, `current` or `complete`, plus `issues(id)`. Replaces `status()`, `isComplete()` and `setComplete()`.
- **Snapshots instead of controlled props.** `snapshot()`, `restore()`, the `snapshot` option and a single `onChange` replace `step`/`data`/`completed` and their callbacks.
- **Automatic ARIA pattern.** A `linear` flow renders an ordered list of steps with `aria-current="step"`; a free flow renders tabs.
- **Fewer primitives**: `Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`. `Stepper.List` takes a function child instead of `Stepper.Items`; `Title` and `Description` are always a `span`; `Actions` and `Separator` are gone.
- **Smaller**: 4.4 kB with primitives (was 5.4) and 1.8 kB for the hooks only (was 3.6), min + gzip.

Removed from the instance: `id`, `count`, `progress`, `completed`, `isFirst`, `isLast`, `canPrev`, `canNext`, `is`, `status`, `isComplete`, `setComplete`, `validate` and the `data.*` methods (use `data`, `setData`, `current`, `index` and `state`). Removed entries and helpers: `@stepperize/react/primitives`, `definition.get`, `at`, `parseStep`, `validate`, and the utilities exported by `@stepperize/core`.

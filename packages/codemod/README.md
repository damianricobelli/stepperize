# @stepperize/codemod

Migrates code between major versions of Stepperize.

## Usage

```bash
npx @stepperize/codemod v9 src
```

Pass one or more files or directories. It reads `.ts`, `.tsx`, `.js` and `.jsx`
files and skips `node_modules`, `dist` and other build output. Add `--dry` to
see what would change without writing anything.

Commit your work first, then:

1. Run the codemod. It prints the files it changed and a summary.
2. Run your formatter: rewritten lines keep your quotes and indentation, but
   not your line breaks.
3. Search for `TODO(stepperize-v9)`. Each comment sits above a statement that
   needs a decision and says what replaces the old API.

Run it once: a second run changes nothing, and the comments are not repeated.

## `v9`: from 8.x to 9.0

### Rewritten for you

| v8 | v9 |
| --- | --- |
| `stepper.id` | `stepper.current.id` |
| `stepper.count` | `stepper.steps.length` |
| `stepper.is("a")` | `stepper.current.id === "a"` |
| `stepper.canPrev`, `stepper.canNext` | `!stepper.isFirst && !stepper.isPending`, `!stepper.isLast && !stepper.isPending` |
| `!stepper.canPrev`, `!stepper.canNext` | `stepper.isFirst \|\| stepper.isPending`, `stepper.isLast \|\| stepper.isPending` |
| `stepper.isComplete(id)` | `stepper.state(id) === "complete"` |
| `stepper.completed` | `stepper.snapshot().complete` |
| `stepper.data.get("a")`, `data.get()` | `stepper.data.a`, `stepper.data[stepper.current.id]` |
| `stepper.data.all()` | `stepper.data` |
| `stepper.data.set("a", value)`, `data.set(value)` | `stepper.setData("a", value)`, `stepper.setData(stepper.current.id, value)` |
| `stepper.data.update("a", fn)` | `stepper.setData("a", fn(stepper.data.a))` |
| `stepper.next({ data, complete: true })` | `stepper.next(data)` |
| `<Stepper.Root>{({ stepper }) => ...}` | `<Stepper.Root>{(stepper) => ...}` |
| `<Stepper.List><Stepper.Items>{fn}</Stepper.Items></Stepper.List>` | `<Stepper.List>{fn}</Stepper.List>` |
| `<Stepper.Actions>`, `<Stepper.Separator>` | `<div>`, `<hr>` |
| `beforeStepChange` | `guard` |
| `defaultStep`, `defaultData`, `defaultCompleted` | `snapshot: { step, data, complete }` |

Options are rewritten in `defineStepper(steps, options)`, `useStepper(options)`
and as props of `Stepper.Root` and `Provider`.

### Left as a `TODO(stepperize-v9)` comment

- `status(id)`, `validate()`, `setComplete()`, `data.clear()` and `data.reset()`.
- Arguments that no longer exist: `goTo(id, options)`, `prev(payload)`, `reset(options)`.
- Controlled state: `data`, `onDataChange`, `completed`, `onCompletedChange`, `onStepChange` and `onInvalidStep`.
- In the guard: `validate()`, `fromIndex`, `toIndex`, `statuses`, and the `"goto"` and `"reset"` directions.
- `result.from` on the result of a move.
- `definition.get()`, `at()`, `parseStep()` and `validate()`.
- The `@stepperize/react/primitives` entry.
- Removed properties taken by destructuring: `const { id, canNext } = useStepper()`.
- A `Stepper.Items` that has siblings inside its `Stepper.List`.

### What it follows

The codemod only rewrites a value it can tell is a stepper:

- the result of `useStepper()` and of `useStepperContext()`;
- the argument of a `useStepperContext((stepper) => ...)` selector;
- the stepper a `Stepper.Root` passes to its function child;
- an argument or variable typed as a stepper: `Stepper` from
  `@stepperize/react`, or an alias such as `ReturnType<typeof flow.useStepper>`.

It does not follow a stepper through your own hooks, refs, context or untyped
props. After running it, search for what may be left: `.data.get(`, `.data.set(`,
`.canNext`, `.canPrev`, `.isComplete(`.

It does not touch CSS either. `data-status="active | previous | upcoming"` is now
`data-state="current | complete | pending"`; update selectors such as
`data-[status=active]:`.

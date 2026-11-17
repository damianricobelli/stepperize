# @stepperize/codemod

Migrates code between major versions of Stepperize.

## Usage

```bash
npx @stepperize/codemod v9 src
```

Pass one or more files or directories. It rewrites `.ts`, `.tsx`, `.js` and
`.jsx` files and skips `node_modules`, `dist` and other build output.

It needs Node 22.18 or later (or 24.11 or later). Only the codemod does: your
project can target any Node version.

| Option | |
| --- | --- |
| `--dry` | Report what would change without writing anything. |
| `--check` | Type-check the migrated files and list the errors left in them. |
| `--json` | Print the report as JSON: every TODO with its file and line, the warnings, the style sheets to update and, with `--check`, the type errors. |
| `--no-types` | Find steppers from the syntax alone, without the project's TypeScript. |

Commit your work first, then:

1. Install `@stepperize/react@9`, so `--check` compares your code with the new
   types.
2. Run the codemod with `--check`. It prints the files it changed, then what
   is left for you: each kind of `TODO(stepperize-v9)` with its files, the
   rewrites worth a look, the style sheets that still use the v8 attributes
   and the type errors in what it migrated.
3. Run your formatter. Lines the codemod did not have to touch are left as they
   were; a rewritten statement keeps your quotes and indentation, but not
   always its line breaks.
4. Search for `TODO(stepperize-v9)`. Each comment sits above a statement that
   needs a decision and says what replaces the old API.
5. Fix the type errors `--check` listed. They are v8 calls the codemod could
   not rewrite.

A coding agent can do steps 3 to 5 for you: the
[agent prompt](https://stepperize.com/docs/v9/react/migration-agent) has the
rules for every comment the codemod leaves.

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
| A guard that only returned `(await validate()).success` | Removed: `next()` validates |
| `stepper.status(id) === "active"` | `stepper.state(id) === "current"` |
| `defaultStep`, `defaultData`, `defaultCompleted` | `snapshot: { step, data, complete }` |
| `data-[status=active]`, `[data-status="active"]` | `data-[state=current]`, `[data-state="current"]` |
| `data-[status=upcoming]` | `data-[state=pending]` |
| `data-[status=previous]`, `data-[complete]`, `data-complete:` | `data-[state=complete]` |

Options are rewritten in `defineStepper(steps, options)`, `useStepper(options)`
and as props of `Stepper.Root` and `Provider`.

### Left as a `TODO(stepperize-v9)` comment

- `status(id)` compared with `"previous"` or `"upcoming"`, or used as a value.
- `validate()`, `setComplete()`, `data.clear()` and `data.reset()`.
- Arguments that no longer exist: `goTo(id, options)`, `prev(payload)`, `reset(options)`.
- Controlled state: `data`, `onDataChange`, `completed`, `onCompletedChange`, `onStepChange` and `onInvalidStep`.
- In a guard that does more than validate: `validate()`, `fromIndex`, `toIndex`, `statuses`, and the `"goto"` and `"reset"` directions.
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

- a stepper kept in a ref typed as one (`useRef<Stepper | null>(null)`) and
  read into a variable: `const stepper = ref.current`;
- what your own hooks return, when the hook is in the same file: the stepper
  itself, or an object that carries it (`return { stepper, invites }`).

### With your types

When the project has a `tsconfig.json` and TypeScript installed, the codemod
also asks the type checker which values are steppers. That follows a stepper
through props, your own context, hooks in other files and anything else that
is typed, whatever its name. It prints which config it used.

It needs the TypeScript compiler API (`typescript` 5 or 6). Without it, with
`--no-types`, or in a JavaScript project, the codemod works from the syntax
alone and does not follow a stepper across files or through untyped props.
Either way, where it finds the unmistakable v8 names on a value it could not
follow (`.data.get()`, `.data.set()`, `.data.all()`, `.data.update()`,
`.canPrev`, `.canNext`, `.isComplete()`, `.setComplete()`), it leaves a
`TODO(stepperize-v9)` instead of guessing.

### Styles

In files that use a stepper, `data-status` selectors become `data-state`, as
Tailwind variants and as CSS attribute selectors inside strings. One of them
changes meaning: `previous` meant "before the current step", and `complete`
means "validated by `next()`". They match in a flow walked with `next()`; in a
flow that jumps with `goTo()`, check the styles. The summary lists the files
where this happened.

Style sheets (`.css`, `.scss`, `.sass`, `.less`, `.pcss`, `.styl`) are read but
never rewritten: the summary lists each line that still mentions `data-status`
or `data-complete`, for you to update if it targets a stepper part.

# Stepperize

> Type-safe multi-step flows (wizards, multi-step forms, onboarding, checkout) from one definition. `@stepperize/core` is the state machine, with no framework; bindings for React (the main one), Vue, Svelte, Solid, Angular, Lit and plain HTML wrap it with the same API and unstyled, accessible primitives. This is v9.

Packages: `@stepperize/react` (React 18 and 19), `@stepperize/vue` (Vue 3.5+), `@stepperize/svelte` (Svelte 5), `@stepperize/solid`, `@stepperize/angular`, `@stepperize/lit`, `@stepperize/core` (and `@stepperize/core/dom` for plain HTML). Use the package of the project's framework. Everything below is the same in every binding unless a line says otherwise; examples are React.

## Definition

Define the steps once, at module scope:

```tsx
"use client";
import { defineStepper } from "@stepperize/react"; // or @stepperize/vue, /svelte, /solid, /angular, /lit
const checkout = defineStepper(
  [
    { id: "shipping", title: "Shipping", schema: shippingSchema },
    { id: "payment", title: "Payment", schema: paymentSchema },
    { id: "review", title: "Review" },
  ],
  { linear: true },
);
```

The definition returns the same things in every binding, named the framework's way:

| Framework | Own a flow | Share a flow | Read the shared flow | Primitives |
| --- | --- | --- | --- | --- |
| React | `checkout.useStepper(options?)` | `checkout.Provider`, `checkout.Stepper.Root` | `checkout.useStepperContext(selector?)` | `checkout.Stepper.*` components |
| Vue | `checkout.useStepper(options?)` (reactive, no `.value`) | `checkout.Provider`, `Stepper.Root` | `checkout.useStepperContext(selector?)` | `checkout.Stepper.*` components, slots, `as-child` |
| Svelte | `checkout.useStepper(options?)` | `checkout.Provider`, `Stepper.Root` | `checkout.useStepperContext()` | `checkout.Stepper.*` components, snippets |
| Solid | `checkout.useStepper(options?)` | `checkout.Provider`, `Stepper.Root` | `checkout.useStepperContext(selector?)` | `checkout.Stepper.*` components |
| Angular | `checkout.injectStepper(options?)`, a signal: `stepper()` | `providers: [checkout.provideStepper(options?)]` | `checkout.injectStepperContext()` | `stepperRoot`, `stepperList`, `stepperItem`... directives |
| Lit | `checkout.controller(host, options?)`, read `.value` | `checkout.controller(host, otherController.flow)` follows that flow | | `root()`, `list()`, `item(id)`... element directives on the controller |
| HTML | `createStepper(steps, options?)` from `@stepperize/core` | | | `bindStepper(element, flow)` from `@stepperize/core/dom` on `data-component` markup |

- checkout.create(options?) returns the same flow without a framework, for tests, servers and agents (`createStepper` in `@stepperize/core`).
- checkout.steps is the step array.
- In React, `useStepperContext()` outside a `Provider` or `Stepper.Root` throws SZ100.
- Each binding has a `/headless` entry (for example `@stepperize/react/headless`) with the same definition and no primitives.

`schema` is any Standard Schema v1 (Zod, Valibot, ArkType). It types the step's data and output.

## Stepper

State: steps, current, index, isFirst, isLast, progress, data, output, isPending, isFinished.
Queries: state(id) is "pending", "current" or "complete"; issues(id?) are the issues of the last failed check, gone once that step's data changes; canGoTo(id).
Render: match({ shipping: (step, data) => ..., payment: ..., review: ... }), exhaustive.
Actions: next(data?), prev(), goTo(id), setData(id, data), validate(id?), reset(), restore(snapshot), snapshot().

Removed since v8: id, count, completed, canPrev, canNext, is, status, isComplete, setComplete and the data.* methods. Use current, index, state, data and setData.

## Moves

next(data?) saves the data on the current step, validates it against the step's schema, completes the step and moves on. On the last step it finishes the flow: onFinish runs, the result has to: null and isFinished becomes true. prev() takes no arguments and returns along the path taken. goTo(id) jumps, subject to linear.

All three return Promise<Result>: { accepted: true, to, data } or { accepted: false, reason }. Reasons: invalid (with issues), guard, policy, pending, boundary, cancelled, finished. Await the result and test result.accepted, never its truthiness.

validate(id?) checks a step's stored data without moving and resolves with its issues or undefined.

Completion follows the data: setData on a complete step makes it pending again, and in a linear flow so are the steps completed after it. There is no completion setter.

data holds each step as it was typed (schema input). output holds what each complete step's schema produced (schema output).

## Options

Accepted by defineStepper as defaults, and per flow by whatever owns one (useStepper, Provider, Stepper.Root, injectStepper, provideStepper, controller) and by create:

- linear: completed steps can be revisited; every other step is reached through next().
- next: branches, as { stepId: (output, data) => nextId | null }. A null entry or result ends the flow at that step.
- guard({ from, to, direction, data, signal }): return false to refuse a move, optionally asynchronously. to is null when the flow is finishing. Validation is not the guard's job.
- onFinish(output, data): runs once when the flow finishes. Return a promise and the flow stays pending until it settles; if it rejects, the user can try again.
- snapshot: where to start, as { step, history, data, complete }. Read once.
- onChange(snapshot): called after every change worth persisting.
- step: an outside value the flow follows, such as a URL parameter. linear and guard still apply; onInvalidStep(id) reports where the flow really is when it cannot follow.

## Primitives

The primitives are unstyled: Root, List, Item, Trigger, Title, Description, Indicator, Content, Prev and Next (React, Vue, Svelte, Solid components; Angular and Lit directives; `data-component="stepper-*"` attributes in plain HTML). A linear flow renders an ordered list with aria-current="step"; a free flow renders tabs. Root has data-pending while a move runs and data-finished once the flow is done.

In React, Stepper.List takes a function child: (step) => <Stepper.Item step={step.id}>...</Stepper.Item>. Stepper.Content takes step and optionally forceMount. Stepper.useItem() returns the enclosing item, including its state and pending. For custom markup or React Native, @stepperize/react/headless exports defineStepper with the same hooks and no Stepper primitives.

## Forms

Keep field state in the form library. On submit, await stepper.next(values): it validates against the step's schema and returns the issues when it fails. Seed a remounted form from stepper.data[id]. Save a draft with stepper.setData(id, values) before stepper.prev().

## Documentation

Each framework has its own docs at /docs/v9/<framework> (react, vue, svelte, solid, angular, lit, html, core). The concept pages live in the React docs and apply to every binding:

- /docs/v9/react/first-stepper: a complete first flow (each framework has its own first-stepper page)
- /docs/v9/react/concepts/moves: next, prev, goTo and their results
- /docs/v9/react/guides/validation: schemas, issues and output
- /docs/v9/react/guides/branching: declarative branches
- /docs/v9/react/guides/persistence and /docs/v9/<framework>/guides/url: snapshots and the URL
- /docs/v9/react/forms and /docs/v9/<framework>/guides/forms: form integrations
- /docs/v9/react/migration: upgrade from v8 (React), with `npx @stepperize/codemod v9 src`
- /docs/v9/react/migration-agent: the rules an agent follows to finish that upgrade
- /docs/v9/core: the state machine without a framework

The v8 API (beforeStepChange, next({ data, complete }), data.get/set, status, setComplete, Stepper.Items) is obsolete in v9. Versions before v9 were React only.

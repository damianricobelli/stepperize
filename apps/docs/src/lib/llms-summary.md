# Stepperize v9

Type-safe step-by-step flows. `@stepperize/core` is the state machine, with no framework; `@stepperize/react` binds it to React 18 and 19 with hooks and unstyled, accessible primitives.

## Definition

Define the steps once at module scope, in a client module:

```tsx
"use client";
import { defineStepper } from "@stepperize/react";
const checkout = defineStepper(
  [
    { id: "shipping", title: "Shipping", schema: shippingSchema },
    { id: "payment", title: "Payment", schema: paymentSchema },
    { id: "review", title: "Review" },
  ],
  { linear: true },
);
```

- checkout.useStepper(options?) creates a flow owned by that component. It re-renders on every change.
- checkout.Provider and checkout.Stepper.Root own a flow and share it with everything below.
- checkout.useStepperContext() reads the nearest owner and throws SZ100 when there is none. checkout.useStepperContext(selector) re-renders only when the selected value changes; a selector may return an object.
- checkout.create(options?) returns the same flow without React, for tests, servers and agents.
- checkout.steps is the step array.

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

Accepted by defineStepper as defaults and by useStepper, Provider, Stepper.Root and create per flow:

- linear: completed steps can be revisited; every other step is reached through next().
- next: branches, as { stepId: (output, data) => nextId | null }. A null entry or result ends the flow at that step.
- guard({ from, to, direction, data, signal }): return false to refuse a move, optionally asynchronously. to is null when the flow is finishing. Validation is not the guard's job.
- onFinish(output, data): runs once when the flow finishes. Return a promise and the flow stays pending until it settles; if it rejects, the user can try again.
- snapshot: where to start, as { step, history, data, complete }. Read once.
- onChange(snapshot): called after every change worth persisting.
- step: an outside value the flow follows, such as a URL parameter. linear and guard still apply; onInvalidStep(id) reports where the flow really is when it cannot follow.

## Primitives

checkout.Stepper has Root, List, Item, Trigger, Title, Description, Indicator, Content, Prev and Next. They are unstyled.

Stepper.List takes a function child: (step) => <Stepper.Item step={step.id}>...</Stepper.Item>. Stepper.Content takes step and optionally forceMount. Stepper.useItem() returns the enclosing item, including its state and pending. A linear flow renders an ordered list with aria-current="step"; a free flow renders tabs. Root has data-pending while a move runs and data-finished once the flow is done.

For custom markup or React Native, @stepperize/react/headless exports defineStepper with the same hooks and no Stepper primitives.

## Forms

Keep field state in the form library. On submit, await stepper.next(values): it validates against the step's schema and returns the issues when it fails. Seed a remounted form from stepper.data[id]. Save a draft with stepper.setData(id, values) before stepper.prev().

## Documentation

- /docs/v9/react/first-stepper: a complete first flow
- /docs/v9/react/concepts/moves: next, prev, goTo and their results
- /docs/v9/react/guides/validation: schemas, issues and output
- /docs/v9/react/guides/branching: declarative branches
- /docs/v9/react/guides/persistence and /docs/v9/react/guides/url: snapshots and the URL
- /docs/v9/react/forms: form library integrations
- /docs/v9/react/migration: upgrade from v8, with `npx @stepperize/codemod v9 src`
- /docs/v9/core: the state machine without a framework

The v8 API (beforeStepChange, next({ data, complete }), data.get/set, status, setComplete, Stepper.Items) is obsolete in v9.

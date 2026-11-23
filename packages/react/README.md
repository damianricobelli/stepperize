<p align="center">
  <img src="https://www.stepperize.com/api/og?title=The+type-safe+way+to+build+multi-step+experiences.&description=Build+type-safe+wizards%2C+forms%2C+and+onboarding+flows+in+React.&section=Documentation&variant=website" alt="Stepperize Logo" />
</p>

# @stepperize/react

Type-safe step-by-step workflows for React.

## Installation

```bash
npm install @stepperize/react
```

Requires React 18 or 19. The documentation is at
[stepperize.com](https://stepperize.com/docs).

## Quick start

```tsx
import { defineStepper } from "@stepperize/react";
import { z } from "zod";

const checkout = defineStepper([
  { id: "shipping", title: "Shipping", schema: z.object({ address: z.string().min(1) }) },
  { id: "payment", title: "Payment", schema: z.object({ card: z.string().length(16) }) },
  { id: "review", title: "Review" },
]);

function Checkout() {
  const stepper = checkout.useStepper({ onFinish: (output) => placeOrder(output) });

  return (
    <section>
      <h2>{stepper.current.title}</h2>

      {stepper.match({
        shipping: (_step, data) => <ShippingForm defaultValues={data} />,
        payment: (_step, data) => <PaymentForm defaultValues={data} />,
        review: () => <Review data={stepper.data} />,
      })}

      {stepper.issues()?.map((issue, index) => <p key={index}>{issue.message}</p>)}

      <button type="button" disabled={stepper.isFirst} onClick={() => stepper.prev()}>
        Back
      </button>
      <button type="button" onClick={() => stepper.next(readForm())}>
        {stepper.isLast ? "Place order" : "Continue"}
      </button>
    </section>
  );
}
```

`next(data)` saves the data of the current step, validates it against the
step's `schema` (any [Standard Schema](https://standardschema.dev)) and moves
on. It resolves with what happened instead of throwing:

```tsx
const result = await stepper.next(values);
if (!result.accepted) console.log(result.reason, result.issues);
```

## The stepper

| | |
| --- | --- |
| `current`, `index`, `steps` | Where the flow is. |
| `isFirst`, `isLast`, `progress` | Derived position. `isLast` means `next()` finishes the flow. |
| `isFinished` | `next()` completed the last step and `onFinish` settled. |
| `state(id)` | `"pending"`, `"current"` or `"complete"`. |
| `data`, `setData(id, data)` | The data of every step as it was typed, keyed by step id. |
| `output` | What the schema of each complete step produced: transforms and defaults applied. |
| `validate(id?)` | Check a step without moving. Resolves with its issues, or `undefined`. |
| `issues(id?)` | Why the last validation failed, until the data changes. |
| `next(data?)`, `prev()`, `goTo(id)` | Moves. Each resolves with `{ accepted, ... }`. |
| `canGoTo(id)`, `isPending` | Whether a jump is allowed, and whether an async check is running. |
| `match(handlers)` | Exhaustive rendering by step. |
| `snapshot()`, `restore(snapshot)`, `reset()` | Save, resume and start over. |

## Options

Pass them to `defineStepper(steps, options)` as defaults, or to `useStepper`,
`Provider` and `Stepper.Root` per instance.

```tsx
checkout.useStepper({
  // Only move forward through next(); completed steps can be revisited.
  linear: true,
  // Branch on a step's validated data.
  next: { shipping: (data) => (data.address === "pickup" ? "review" : "payment") },
  // Runs before every move. Return false to refuse it. May be async.
  guard: ({ direction }) => direction !== "prev" || confirm("Discard changes?"),
  // Resume a saved flow, and save it on every change.
  snapshot: JSON.parse(localStorage.getItem("checkout") ?? "{}"),
  onChange: (snapshot) => localStorage.setItem("checkout", JSON.stringify(snapshot)),
  // The last step was completed. Runs once, with what the schemas produced.
  // Return the promise: the flow stays pending, and a failure lets the user retry.
  onFinish: (output) => placeOrder(output),
});
```

### Keep the step in the URL

`step` makes the flow follow a value that lives somewhere else. `linear` and
the guard still apply, so a deep link cannot skip validation; when the flow
cannot follow, `onInvalidStep` tells you where it really is.

```tsx
const { step } = useParams();
const stepper = checkout.useStepper({
  step,
  onChange: (snapshot) => snapshot.step !== step && router.push(`/checkout/${snapshot.step}`),
  onInvalidStep: (current) => router.replace(`/checkout/${current}`),
});
```

## Shared state

`useStepper()` owns an independent flow. To share one, wrap the tree in the
`Provider` and read it with `useStepperContext`. A selector re-renders the
component only when its result changes.

```tsx
function Page() {
  return (
    <checkout.Provider linear>
      <Header />
      <Actions />
    </checkout.Provider>
  );
}

function Header() {
  const title = checkout.useStepperContext((stepper) => stepper.current.title);
  return <h2>{title}</h2>;
}

function Actions() {
  const stepper = checkout.useStepperContext();
  return (
    <button type="button" onClick={() => stepper.next()}>
      {stepper.isLast ? "Place order" : "Continue"}
    </button>
  );
}
```

## Primitives

Unstyled components that handle roles, keyboard navigation, focus and
announcements. `Stepper.Root` owns the flow and accepts every option.

```tsx
const { Stepper } = checkout;

function CheckoutSteps() {
  return (
    <Stepper.Root linear>
      <Stepper.List>
        {() => (
          <Stepper.Item>
            <Stepper.Trigger>
              <Stepper.Indicator />
              <Stepper.Title />
            </Stepper.Trigger>
          </Stepper.Item>
        )}
      </Stepper.List>

      <Stepper.Content step="shipping">...</Stepper.Content>
      <Stepper.Content step="payment">...</Stepper.Content>
      <Stepper.Content step="review">...</Stepper.Content>

      <Stepper.Prev>Back</Stepper.Prev>
      <Stepper.Next>Continue</Stepper.Next>
    </Stepper.Root>
  );
}
```

Style them through `data-state`, `data-invalid`, `data-disabled`,
`data-pending` and `data-orientation`. Inside an item, `Stepper.useItem()`
returns its `step`, `index`, `state`, `invalid`, `disabled` and `pending`.

## Without React

The same state machine runs anywhere: tests, servers, agents.

```ts
const flow = checkout.create({ linear: true });
await flow.next({ address: "1 Main St" });
flow.current.id; // "payment"
```

## Smaller bundles with your own UI

Import `defineStepper` from `@stepperize/react/headless` to keep the hooks and
the `Provider` without the `Stepper` components.

## Documentation

Read the full docs at [stepperize.com](https://stepperize.com).

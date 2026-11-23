<p align="center">
  <img src="https://www.stepperize.com/api/og?title=The+type-safe+way+to+build+multi-step+experiences.&description=Build+type-safe+wizards%2C+forms%2C+and+onboarding+flows+in+React.&section=Documentation&variant=website" alt="Stepperize Logo" />
</p>

[![Build Size](https://img.shields.io/bundlephobia/minzip/@stepperize/react@latest?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=@stepperize/react@latest)
[![Version](https://img.shields.io/npm/v/@stepperize/react?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@stepperize/react)
[![Downloads](https://img.shields.io/npm/dt/@stepperize/react.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@stepperize/react)

Stepperize is a type-safe toolkit for building step-by-step workflows in React.

Define steps once, consume a flat stepper everywhere. Steps are plain objects,
custom fields stay typed, and the UI is fully yours.

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

      {stepper.issues()?.map((issue) => <p key={issue.message}>{issue.message}</p>)}

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
  // Runs before every move. Return false to cancel it. May be async.
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

## Packages

This repository is a pnpm workspace managed with Turbo.

- `packages/core` - framework-agnostic utilities and TypeScript types for
  step-based workflows.
- `packages/react` - React and React Native bindings, including
  `defineStepper` and unstyled primitives.
- `apps/docs` - the Stepperize documentation site, block gallery, changelog,
  and shadcn-compatible registry.

## Development

Use Node.js 24.18.0 (`.nvmrc`) and pnpm 10.28.0 for development. The published React package still supports React 18 and 19.

```bash
nvm use
pnpm install --frozen-lockfile
pnpm dev
```

`pnpm dev` builds the library packages before starting watchers and the documentation server.

Common workspace commands:

```bash
pnpm check # typecheck, tests and production build
pnpm build
pnpm lint
pnpm format-and-lint
pnpm format-and-lint:fix
```

Target a single package or app with pnpm filters:

```bash
pnpm --filter @stepperize/react test
pnpm --filter @stepperize/core build
pnpm --filter docs dev
```

## Documentation

Read the full docs at [stepperize.com](https://stepperize.com).

The docs app lives in `apps/docs` and is built with TanStack Start, TanStack
Router, Fumadocs, MDX, Tailwind CSS, and a generated shadcn registry for the
example blocks.

## Contributing

We welcome contributions. Please see our [Contributing Guide](CONTRIBUTING.md).

## License

Stepperize is [MIT licensed](LICENSE).

## Compatibility

Compatibility checks run the same runtime, SSR/hydration and TypeScript tests in isolated React 18/19 installs (Node 24 recommended):

```bash
pnpm test:install
pnpm --filter @stepperize/core build
node scripts/test-react-compat.mjs 18
node scripts/test-react-compat.mjs 19
```

### Testing in a real browser

All suites use Vitest. Core, server rendering and pure documentation utilities run in Node; React hooks, hydration, primitives and interactive examples run in Chromium through Vitest Browser Mode and `vitest-browser-react`. DOM assertions and user interactions come from `vitest/browser`.

```bash
pnpm install --frozen-lockfile
pnpm test:install # Download Chromium headless shell once, and after Playwright upgrades
pnpm test
```

CI installs Chromium and its Linux dependencies with `playwright install --with-deps --only-shell chromium`. For an existing Chromium installation, set `STEPPERIZE_CHROMIUM_PATH` to its executable; this override is also used by the React compatibility checks and benchmark. Prefer Playwright's matching browser for reproducible checks.

Use `await render(...)`, locator actions such as `await page.getByRole("button").click()`, and `await expect.element(locator)` for DOM assertions that retry. Direct state/root updates use React's `act`; it is unnecessary around native browser actions.

### Performance comparison

Run `pnpm benchmark` to compare the published 8.0.1 with the v9 working tree, using production React in Chromium through Vitest Browser Mode. Run `pnpm test:install` first. It prints a table with signed changes, marks rows whose interquartile ranges overlap as noise, and flags the scenarios where the two versions do not do the same work. Raw samples go to `scripts/benchmarks/results.json`.

### Bundle size

Contributors can run `pnpm benchmark:size` to verify the built public entries and their minified/gzip sizes.

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
npm install @stepperize/react@^8.0.0
```

Requires React 18 or 19. This branch prepares v8; see the [migration guide](https://stepperize.com/docs/v8/migration/v8).

## Quick Start

```tsx
import { defineStepper } from "@stepperize/react";

const checkout = defineStepper([
  { id: "shipping", title: "Shipping", description: "Enter your address" },
  { id: "payment", title: "Payment", description: "Payment details" },
  { id: "review", title: "Review", description: "Confirm your order" },
]);

function Checkout() {
  const stepper = checkout.useStepper();

  return (
    <section>
      <h2>{stepper.current.title}</h2>
      <p>{stepper.current.description}</p>

      {stepper.match({
        shipping: () => <ShippingForm />,
        payment: () => <PaymentForm />,
        review: () => <ReviewOrder />,
      })}

      <button type="button" onClick={() => stepper.prev()} disabled={!stepper.canPrev}>
        Back
      </button>
      <button type="button" onClick={() => stepper.next()} disabled={!stepper.canNext}>
        Continue
      </button>
    </section>
  );
}
```

## What You Get

- `useStepper()` for independent local state.
- `useStepperContext(selector?, isEqual?)` to consume a shared instance.
- `Provider` when multiple descendants need the same instance.
- `Stepper` primitives for accessible, unstyled UI.
- Flat state and navigation: `id`, `current`, `index`, `next`, `prev`, `goTo`,
  `reset`.
- Typed rendering with `match` and `is`.
- Step-scoped drafts with `data`, optionally validated via per-step `schema`
  (Standard Schema).
- Explicit completion with `setComplete` and `isComplete`.

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

## Navigation in v8

```tsx
const result = await stepper.next({ data: values, complete: true });
if (!result.accepted) console.log(result.reason);
await stepper.goTo("review", { bypassPolicy: true }); // intentional branch; guard still runs
await stepper.reset(); // restore mount-time step, data and completion
await stepper.reset({ keepData: true, keepCompleted: true });
```

`complete: true` marks the source step only after acceptance. Defaults are captured at mount. Navigation methods use the latest committed state; hook reads are render snapshots. Treat definitions and snapshot data as immutable.

See [local and shared state](https://stepperize.com/docs/v8/guides/local-and-shared-state) and [the v8 changelog](https://stepperize.com/docs/v8/changelog).

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

Run `pnpm benchmark` to compare the pinned v7.0.0 source with the current v8 working tree using production React in Chromium via Vitest Browser Mode. Run `pnpm test:install` first. The command prints a terminal table with signed changes and win/loss indicators, and refreshes the performance documentation tables and raw samples. See the [benchmark methodology](apps/docs/content/docs/docs/v8/guides/performance.mdx) for fixtures, source identifiers, and limitations.

### Smaller bundles with a custom UI

Import `defineStepper` from `@stepperize/react/headless` to keep hooks, Provider, selectors and validation without the generated `Stepper` components. The default import path still includes all accessible primitives.

See the [bundle comparison and example](https://stepperize.com/docs/v8/guides/performance#smaller-bundles-with-your-own-ui). Contributors can run `pnpm benchmark:size` to verify built public entries and their minified/gzip sizes.

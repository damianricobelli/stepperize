<p align="center">
  <img src="https://stepperize.com/banner.png" alt="Stepperize Logo" />
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

      <button onClick={() => stepper.prev()} disabled={!stepper.canPrev}>
        Back
      </button>
      <button onClick={() => stepper.next()} disabled={!stepper.canNext}>
        Continue
      </button>
    </section>
  );
}
```

## What You Get

- `useStepper()` for local or shared stepper state.
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

Use Node.js 18 or newer and pnpm 10.

```bash
pnpm install
pnpm dev
```

Common workspace commands:

```bash
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

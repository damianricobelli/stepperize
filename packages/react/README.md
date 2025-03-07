<p align="center">
  <img src="https://stepperize.vercel.app/banner.png" alt="Stepperize Logo" />
</p>

[![Build Size](https://img.shields.io/bundlephobia/minzip/@stepperize/react@latest?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=@stepperize/react@latest)
[![Version](https://img.shields.io/npm/v/@stepperize/react?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@stepperize/react)
[![Downloads](https://img.shields.io/npm/dt/@stepperize/react.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@stepperize/react)

A library for creating step-by-step workflows in your apps

- 🚀 Fast and efficient
- 🔥 Powerful and flexible
- 📦 Lightweight (1.1kB gzipped)
- 🪄 Fully type-safe
- 🔗 Composable architecture
- 🎨 Unstyled for maximum customization

## Installation

```bash
npm install @stepperize/react
```

## Quick Start

1. Import the constructor:

```tsx
import { defineStepper } from "@stepperize/react";
```

2. Define your steps:

```tsx
const { Scoped, useStepper, steps } = defineStepper(
  { id: "step-1", title: "Step 1", description: "Description for step 1" },
  { id: "step-2", title: "Step 2", description: "Description for step 2" },
  { id: "step-3", title: "Step 3", description: "Description for step 3" },
  { id: "step-4", title: "Step 4", description: "Description for step 4" }
);
```

3. Use the hook in your components:

```tsx
function StepperComponent() {
  const { currentStep, nextStep, prevStep } = useStepper();

  return (
    <div>
      <h2>{currentStep.title}</h2>
      <p>{currentStep.description}</p>
      <button onClick={prevStep}>Previous</button>
      <button onClick={nextStep}>Next</button>
    </div>
  );
}
```

## How It Works

Stepperize allows you to define a series of steps with unique IDs. When you create your steps using `defineStepper`, you get:

- A `Scoped` component for context management
- A `useStepper` hook for step control
- An array of `steps` for rendering
- An `utils` object with useful functions

The only required field for each step is the `id`. You can add any additional properties you need, and they'll be fully type-safe when using the hook.

## Documentation

For more detailed information on usage, configuration, and advanced features, visit our [full documentation](https://stepperize.vercel.app).

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for more details.

## License

Stepperize is [MIT licensed](LICENSE).

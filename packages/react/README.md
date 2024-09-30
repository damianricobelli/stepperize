<p align="center">
  <img src="https://stepperize.vercel.app/banner.png" alt="Stepperize Logo" />
</p>

# Stepperize

A powerful, lightweight library for creating step-by-step workflows in React applications.

## Features

- 🚀 Fast
- 🔥 Powerful
- 📦 Lightweight (< 1kB gzipped)
- 🪄 Typesafe
- 🔗 Composable
- 🎨 Unstyled

## Installation

```bash
npm i @stepperize/react
```

## Quick Start

1. Import the constructor:

```tsx
import { defineStepper } from "@stepperize/react";
```

2. Define your steps:

```tsx
const { Scoped, useStepper, steps } = defineStepper(
  { id: "step-1", title: "Step 1", description: "Description 1" },
  { id: "step-2", title: "Step 2", description: "Description 2" },
  { id: "step-3", title: "Step 3", description: "Description 3" },
  { id: "step-4", title: "Step 4", description: "Description 4" }
);
```

3. Use the hook in your components:

```tsx
function MyComponent() {
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

Stepperize allows you to define a series of steps with unique IDs. The `defineStepper` function returns:

- `Scoped`: A Provider component to wrap your stepper
- `useStepper`: A hook to access and control the current step
- `steps`: An array of the defined steps

## Documentation

For detailed usage instructions and API reference, visit our [documentation](https://stepperize.vercel.app/docs/getting-started/use-stepper).

## Contributing

We welcome contributions! Please open an issue or submit a pull request on our [GitHub repository](https://github.com/yourusername/stepperize).

## License

Stepperize is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
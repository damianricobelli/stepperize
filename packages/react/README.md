
<p align="center">
  <img src="https://stepperize.vercel.app/og.png" />
</p>

A library for creating step-by-step workflows in your applications.

- 🚀 Fast
- 🔥 Powerful
- 📦 Lightweight, < 1kB (gzip)
- 🪄 Typesafe
- 🔗 Composable
- 🎨 Unstyled

## Installation

```bash
npm i @stepperize/react
```

## Understanding the steps

The main idea is that we can define our IDs that will identify each step.
When we define the steps, we get an object that contains everything we need to build our stepper.

## Usage

### Import the constructor

In order to create our steps we need to import the `defineSteps` from the library.

```tsx
import { defineStepper } from "@stepperize/react";
```

### Create the steps

`defineStepper` is a function that allows us to get a Provider, a hook and the array of steps we are using.
The only mandatory value for each step is the `id`. Then, we can add whatever we need and this will be typesafe when we use the hook.

```tsx
const { Scoped, useStepper, steps } = defineStepper(
  { id: "step-1", title: "Label 1", description: "Description 1" },
  { id: "step-2", title: "Label 2", description: "Description 2" },
  { id: "step-3", title: "Label 3", description: "Description 3" },
  { id: "step-4", title: "Label 4", description: "Description 4" }
);
```

### Next steps

Visit the [documentation](https://stepperize.vercel.app/docs/getting-started/use-stepper) to see more details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

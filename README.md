
<p align="center">
  <img src="https://stepperize.vercel.app/og.png" />
</p>

[![Build Size](https://img.shields.io/bundlephobia/minzip/@stepperize/react@latest?label=bundle%20size&style=flat&colorA=000000&colorB=000000)](https://bundlephobia.com/result?p=@stepperize/react@latest)
[![Version](https://img.shields.io/npm/v/@stepperize/react?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@stepperize/react)
[![Downloads](https://img.shields.io/npm/dt/@stepperize/react.svg?style=flat&colorA=000000&colorB=000000)](https://www.npmjs.com/package/@stepperize/react)

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

Visit the [documentation](http://localhost:3000/docs/getting-started/use-stepper) to see more details.

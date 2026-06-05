<p align="center">
  <img src="https://stepperize.vercel.app/banner.png" alt="Stepperize Logo" />
</p>

# @stepperize/react

Type-safe step-by-step workflows for React.

## Installation

```bash
npm install @stepperize/react
```

## Quick Start

```tsx
import { defineStepper } from "@stepperize/react";

const wizard = defineStepper([
  { id: "account", title: "Account" },
  { id: "profile", title: "Profile" },
  { id: "done", title: "Done" },
]);

function Wizard() {
  const stepper = wizard.useStepper();

  return (
    <div>
      <h2>{stepper.current.title}</h2>

      {stepper.match({
        account: () => <AccountStep />,
        profile: () => <ProfileStep />,
        done: () => <DoneStep />,
      })}

      <button onClick={() => stepper.prev()} disabled={!stepper.canPrev}>
        Back
      </button>
      <button onClick={() => stepper.next()} disabled={!stepper.canNext}>
        Next
      </button>
    </div>
  );
}
```

## Shared State

```tsx
function Page() {
  return (
    <wizard.Provider>
      <Header />
      <Wizard />
    </wizard.Provider>
  );
}
```

## Primitives

```tsx
const { Stepper } = wizard;

function PrimitiveWizard() {
  return (
    <Stepper.Root>
      {({ stepper }) => (
        <>
          <Stepper.List>
            <Stepper.Items>
              {(step) => (
                <Stepper.Item key={step.id} step={step.id}>
                  <Stepper.Trigger>
                    <Stepper.Indicator />
                    <Stepper.Title>{step.title}</Stepper.Title>
                  </Stepper.Trigger>
                </Stepper.Item>
              )}
            </Stepper.Items>
          </Stepper.List>

          <Stepper.Actions>
            <Stepper.Prev>Back</Stepper.Prev>
            <Stepper.Next>{stepper.isLast ? "Finish" : "Next"}</Stepper.Next>
          </Stepper.Actions>
        </>
      )}
    </Stepper.Root>
  );
}
```

## Documentation

Read the full docs at [stepperize.vercel.app](https://stepperize.vercel.app).

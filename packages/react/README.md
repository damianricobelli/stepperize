<p align="center">
  <img src="https://www.stepperize.com/api/og?title=The+type-safe+way+to+build+multi-step+experiences.&description=Build+type-safe+wizards%2C+forms%2C+and+onboarding+flows+in+React.&section=Documentation&variant=website" alt="Stepperize Logo" />
</p>

# @stepperize/react

Type-safe step-by-step workflows for React.

## Installation

```bash
npm install @stepperize/react@^8.0.0
```

Requires React 18 or 19. This branch prepares v8; see the [migration guide](https://stepperize.com/docs/v8/migration/v8).

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

      <button type="button" onClick={() => stepper.prev()} disabled={!stepper.canPrev}>
        Back
      </button>
      <button type="button" onClick={() => stepper.next()} disabled={!stepper.canNext}>
        Next
      </button>
    </div>
  );
}
```

## Shared State

`useStepper()` always creates an independent local instance. Shared children explicitly consume their matching Provider:

```tsx
function Page() {
  return <wizard.Provider><Header /><Actions /></wizard.Provider>;
}
function Header() {
  const title = wizard.useStepperContext((stepper) => stepper.current.title);
  return <h2>{title}</h2>;
}
function Actions() {
  const stepper = wizard.useStepperContext();
  return <button type="button" disabled={!stepper.canNext} onClick={() => stepper.next()}>Next</button>;
}
```

`Stepper.Root` is also an owner; it creates its own shared instance. Configure the owner and read it with `useStepperContext()` or the Root render prop.

## Primitives

```tsx
const { Stepper } = wizard;

function PrimitiveWizard() {
  return (
    <Stepper.Root>
      {() => (
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
            <Stepper.Next>Next</Stepper.Next>
          </Stepper.Actions>
        </>
      )}
    </Stepper.Root>
  );
}
```

## Documentation

Read the full docs at [stepperize.com](https://stepperize.com).

## Navigation in v8

```tsx
const result = await stepper.next({ data: values, complete: true });
if (!result.accepted) console.log(result.reason);
await stepper.goTo("done", { bypassPolicy: true }); // intentional branch; guard still runs
await stepper.reset(); // restore mount-time step, data and completion
await stepper.reset({ keepData: true, keepCompleted: true });
```

`complete: true` marks the source step only after acceptance. Defaults are captured at mount. Navigation methods use the latest committed state; hook reads are render snapshots. Treat definitions and snapshot data as immutable.

See [local and shared state](https://stepperize.com/docs/v8/guides/local-and-shared-state) and [the v8 changelog](https://stepperize.com/docs/v8/changelog).


### Smaller bundles with a custom UI

Import `defineStepper` from `@stepperize/react/headless` to keep hooks, Provider, selectors and validation without the generated `Stepper` components. The default import path still includes all accessible primitives.

See the [bundle comparison and example](https://stepperize.com/docs/v8/guides/performance#smaller-bundles-with-your-own-ui). Contributors can run `pnpm benchmark:size` to verify built public entries and their minified/gzip sizes.

# @stepperize/angular

Type-safe step-by-step workflows for Angular.

## Installation

```bash
npm install @stepperize/angular
```

Requires Angular 22. The documentation is at
[stepperize.com](https://stepperize.com/docs/v9/angular).

## Quick start

```ts
import { Component } from "@angular/core";
import { defineStepper } from "@stepperize/angular";
import { z } from "zod";

const checkout = defineStepper([
  { id: "shipping", title: "Shipping", schema: z.object({ address: z.string().min(1) }) },
  { id: "payment", title: "Payment", schema: z.object({ card: z.string().length(16) }) },
  { id: "review", title: "Review" },
]);

@Component({
  selector: "app-checkout",
  template: `
    <h2>{{ stepper().current.title }}</h2>

    @switch (stepper().current.id) {
      @case ("shipping") { <app-shipping-form /> }
      @case ("payment") { <app-payment-form /> }
      @case ("review") { <app-review [data]="stepper().data" /> }
    }

    @for (issue of stepper().issues(); track $index) {
      <p>{{ issue.message }}</p>
    }

    <button type="button" [disabled]="stepper().isFirst" (click)="stepper().prev()">Back</button>
    <button type="button" (click)="stepper().next(readForm())">
      {{ stepper().isLast ? "Place order" : "Continue" }}
    </button>
  `,
})
export class Checkout {
  readonly stepper = checkout.injectStepper({ onFinish: (output) => placeOrder(output) });
}
```

`injectStepper()` returns a signal of the stepper: a new immutable view after
every change. The flow is destroyed with the component.

`next(data)` saves the data of the current step, validates it against the
step's `schema` (any [Standard Schema](https://standardschema.dev)) and moves
on. It resolves with what happened instead of throwing.

## What the definition gives you

| | |
| --- | --- |
| `injectStepper(options?)` | A flow owned by the caller, as a signal. Options can be a function that reads signals. |
| `provideStepper(options?)`, `injectStepperContext()` | One flow shared by a component and everything below it. |
| `create(options?)` | The same state machine without Angular, for tests, servers and services. |

## Primitives

Standalone attribute directives for your own elements:

```ts
import { STEPPER_PRIMITIVES } from "@stepperize/angular";

@Component({
  imports: [STEPPER_PRIMITIVES],
  template: `
    <div [stepperRoot]="stepper">
      <ol stepperList>
        @for (step of stepper.steps; track step.id) {
          <li [stepperItem]="step">
            <button stepperTrigger>
              <span stepperIndicator></span>
              {{ step.title }}
            </button>
          </li>
        }
      </ol>

      <div stepperContent="shipping"><app-shipping-form /></div>
      <div stepperContent="payment"><app-payment-form /></div>
      <div stepperContent="review"><app-review /></div>

      <button stepperPrev>Back</button>
      <button stepperNext>Continue</button>
    </div>
  `,
})
export class CheckoutSteps {
  readonly stepper = checkout.injectStepper({ linear: true });
}
```

They handle roles, ids, keyboard navigation, focus and screen reader
announcements, and expose their state through `data-*` attributes for styling.
Static attributes you write on the root, list, items, panels and indicators
win over theirs; on buttons only `type` is yours. `[stepperRoot]` shares its
stepper with the components inside through `injectStepperContext()`.

Step ids are typed in TypeScript and in template expressions
(`stepper().goTo('shiping')` does not compile). Register a definition and the
ids given to the directives are checked by the template type-checker too:

```ts
declare module "@stepperize/angular" {
  interface StepperRegistry {
    checkout: typeof checkout;
  }
}
```

Without a registry they are strings, and an unknown id is reported when the
template runs, with [SZ102](https://stepperize.com/docs/v9/core/errors#sz102).

If you only want the signals API, import from `@stepperize/angular/headless`.

## Zoneless and server rendering

Everything is signal based, so it works without zone.js. On the server the
roles, ids and hidden panels are in the HTML, no callback runs, and hydration
adopts the same elements, with event replay and incremental hydration.

## License

MIT

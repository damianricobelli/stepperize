# @stepperize/solid

Type-safe step-by-step workflows for Solid.

## Installation

```bash
npm install @stepperize/solid
```

Requires `solid-js` 1.9. The documentation is at
[stepperize.com](https://stepperize.com/docs/v9/solid).

## Quick start

```tsx
import { defineStepper } from "@stepperize/solid";
import { For, Match, Switch } from "solid-js";
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

      <Switch>
        <Match when={stepper.current.id === "shipping"}><ShippingForm /></Match>
        <Match when={stepper.current.id === "payment"}><PaymentForm /></Match>
        <Match when={stepper.current.id === "review"}><Review data={stepper.data} /></Match>
      </Switch>

      <For each={stepper.issues()}>{(issue) => <p>{issue.message}</p>}</For>

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

`useStepper()` returns a reactive object. It works like props: read it in JSX,
memos and effects, and do not destructure its state.

`next(data)` saves the data of the current step, validates it against the
step's `schema` (any [Standard Schema](https://standardschema.dev)) and moves
on. It resolves with what happened instead of throwing:

```ts
const result = await stepper.next(values);
if (!result.accepted) console.log(result.reason, result.issues);
```

## What the definition gives you

| | |
| --- | --- |
| `useStepper(options?)` | A flow owned by the component. Pass a function when an option depends on a signal. |
| `Provider`, `useStepperContext(selector?)` | One flow shared by the components below. A selector returns a memo. |
| `Stepper.*` | Accessible, unstyled primitives: `Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`. |
| `create(options?)` | The same state machine without Solid, for tests, servers and stores. |

## Primitives

```tsx
const { Stepper } = checkout;

<Stepper.Root linear onFinish={placeOrder}>
  <Stepper.List>
    {(step) => (
      <Stepper.Item>
        <Stepper.Trigger>
          <Stepper.Indicator />
          <Stepper.Title />
        </Stepper.Trigger>
      </Stepper.Item>
    )}
  </Stepper.List>

  <Stepper.Content step="shipping"><ShippingForm /></Stepper.Content>
  <Stepper.Content step="payment"><PaymentForm /></Stepper.Content>
  <Stepper.Content step="review"><Review /></Stepper.Content>

  <Stepper.Prev>Back</Stepper.Prev>
  <Stepper.Next>Continue</Stepper.Next>
</Stepper.Root>
```

They handle roles, ids, keyboard navigation, focus and screen reader
announcements, expose their state through `data-*` attributes for styling, and
take `as` to render your own element or component, with its props and `ref`
typed. `step` props are typed with your step ids. A function child declares its
parameter (`(step) => ...`): a function without one is content, as in `<Show>`,
so `<For>` works inside a `List` too.

If you only want the reactive stepper, import from `@stepperize/solid/headless`.

## Server rendering

Works in SolidStart with no configuration: the server renders the current
step, hydration adopts the same elements, and no callback runs on the server.
The package contains no JSX, so it needs no Solid compiler step of its own.

## License

MIT

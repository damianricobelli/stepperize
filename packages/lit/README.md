# @stepperize/lit

Type-safe step-by-step workflows for Lit and web components.

## Installation

```bash
npm install @stepperize/lit
```

Requires Lit 3. The documentation is at
[stepperize.com](https://stepperize.com/docs/v9/lit).

## Quick start

```ts
import { defineStepper } from "@stepperize/lit";
import { html, LitElement } from "lit";
import { z } from "zod";

const checkout = defineStepper([
  { id: "shipping", title: "Shipping", schema: z.object({ address: z.string().min(1) }) },
  { id: "payment", title: "Payment", schema: z.object({ card: z.string().length(16) }) },
  { id: "review", title: "Review" },
]);

class CheckoutSteps extends LitElement {
  stepper = checkout.controller(this, { onFinish: (output) => placeOrder(output) });

  render() {
    const stepper = this.stepper.value;

    return html`
      <h2>${stepper.current.title}</h2>

      ${stepper.match({
        shipping: () => html`<shipping-form></shipping-form>`,
        payment: () => html`<payment-form></payment-form>`,
        review: () => html`<order-review .data=${stepper.data}></order-review>`,
      })}

      ${stepper.issues()?.map((issue) => html`<p>${issue.message}</p>`)}

      <button ?disabled=${stepper.isFirst} @click=${() => stepper.prev()}>Back</button>
      <button @click=${() => stepper.next(this.readForm())}>
        ${stepper.isLast ? "Place order" : "Continue"}
      </button>
    `;
  }
}
customElements.define("checkout-steps", CheckoutSteps);
```

`controller(host, options)` returns a `ReactiveController`: the host updates
whenever the flow changes, and the subscription ends when the host is
disconnected. `this.stepper.value` is the current stepper, a new immutable
object after every change.

`next(data)` saves the data of the current step, validates it against the
step's `schema` (any [Standard Schema](https://standardschema.dev)) and moves
on. It resolves with what happened instead of throwing.

## Primitives

The controller carries the accessible primitives as element directives. They
go on the elements of your own template, so the markup stays yours:

```ts
render() {
  const s = this.stepper;

  return html`
    <div ${s.root()}>
      <ol ${s.list()}>
        ${s.steps.map(
          (step) => html`
            <li ${s.item(step.id)}>
              <button ${s.trigger(step.id)}>
                <span ${s.indicator(step.id)}></span>
                ${step.title}
              </button>
            </li>
          `,
        )}
      </ol>

      <div ${s.content("shipping")}><shipping-form></shipping-form></div>
      <div ${s.content("payment")}><payment-form></payment-form></div>
      <div ${s.content("review")}><order-review></order-review></div>

      <button ${s.prev()}>Back</button>
      <button ${s.next()}>Continue</button>
    </div>
  `;
}
```

They handle roles, ids, keyboard navigation, focus and screen reader
announcements, and expose their state through `data-*` attributes for styling.
Step ids are typed: `s.content("shiping")` does not compile. They work in
shadow DOM and in light DOM, and keep the attributes you write: your name,
role and tab stop on the structure, your `type`, and your `disabled` on top of
the flow's.

If you only want the controller, import from `@stepperize/lit/headless`.

## What the definition gives you

| | |
| --- | --- |
| `controller(host, options?)` | A flow owned by the host. Options can be a function, read again before every render. |
| `controller(host, flow)` | Follow a flow that lives elsewhere, to share it between elements. A function returning the flow follows one that arrives later or changes, such as one from `@lit/context`. |
| `create(options?)` | The same state machine without Lit, for tests, servers and stores. |

`this.stepper.destroy()` ends a controller: it leaves the host, and a flow the host
owns is destroyed with it.

## License

MIT

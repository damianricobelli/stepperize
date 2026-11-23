# @stepperize/svelte

Type-safe step-by-step workflows for Svelte 5.

## Installation

```bash
npm install @stepperize/svelte
```

Requires Svelte 5.29 or newer. The documentation is at
[stepperize.com](https://stepperize.com/docs/v9/svelte).

## Quick start

```svelte
<script lang="ts">
  import { defineStepper } from "@stepperize/svelte";
  import { z } from "zod";

  const checkout = defineStepper([
    { id: "shipping", title: "Shipping", schema: z.object({ address: z.string().min(1) }) },
    { id: "payment", title: "Payment", schema: z.object({ card: z.string().length(16) }) },
    { id: "review", title: "Review" },
  ]);

  const stepper = checkout.useStepper({ onFinish: (output) => placeOrder(output) });
</script>

<section>
  <h2>{stepper.current.title}</h2>

  {#if stepper.current.id === "shipping"}
    <ShippingForm />
  {:else if stepper.current.id === "payment"}
    <PaymentForm />
  {:else}
    <Review data={stepper.data} />
  {/if}

  {#each stepper.issues() ?? [] as issue (issue.message)}
    <p>{issue.message}</p>
  {/each}

  <button type="button" disabled={stepper.isFirst} onclick={() => stepper.prev()}>Back</button>
  <button type="button" onclick={() => stepper.next(readForm())}>
    {stepper.isLast ? "Place order" : "Continue"}
  </button>
</section>
```

`useStepper()` returns a reactive object: markup, `$derived` and `$effect`
follow it. Do not destructure its state.

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
| `useStepper(options?)` | A flow owned by the component. Pass a function when an option depends on state. |
| `Provider`, `useStepperContext()` | One flow shared by the components below. |
| `Stepper.*` | Accessible, unstyled primitives: `Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`. |
| `create(options?)` | The same state machine without Svelte, for tests and servers. |

`fromFlow(flow)` makes a flow from `create()` reactive without a component, for
state that lives in a `.svelte.ts` module:

```ts
// checkout.svelte.ts
import { fromFlow } from "@stepperize/svelte";
export const stepper = fromFlow(checkout.create());
```

## Primitives

```svelte
<script lang="ts">
  const { Stepper } = checkout;
</script>

<Stepper.Root linear onFinish={placeOrder}>
  <Stepper.List>
    {#snippet item()}
      <Stepper.Item>
        <Stepper.Trigger>
          <Stepper.Indicator />
          <Stepper.Title />
        </Stepper.Trigger>
      </Stepper.Item>
    {/snippet}
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
take a `child` snippet to render your own element. `bind:ref` gives you the
element and `{@attach}` reaches it. `step` props are typed with your step ids.

If you only want the reactive stepper, import from `@stepperize/svelte/headless`.

## Server rendering

Works in SvelteKit with no configuration: the server renders the current step,
ids match on hydration, and no callback runs on the server.

## License

MIT

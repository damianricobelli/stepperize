# @stepperize/vue

Type-safe step-by-step workflows for Vue.

## Installation

```bash
npm install @stepperize/vue
```

Requires Vue 3.5 or newer. The documentation is at
[stepperize.com](https://stepperize.com/docs/v9/vue).

## Quick start

```ts
// checkout.ts: define the flow once, outside your components.
import { defineStepper } from "@stepperize/vue";
import { z } from "zod";

export const checkout = defineStepper([
  { id: "shipping", title: "Shipping", schema: z.object({ address: z.string().min(1) }) },
  { id: "payment", title: "Payment", schema: z.object({ card: z.string().length(16) }) },
  { id: "review", title: "Review" },
]);
```

```vue
<script setup lang="ts">
import { checkout } from "./checkout";

const stepper = checkout.useStepper({ onFinish: (output) => placeOrder(output) });
</script>

<template>
  <section>
    <h2>{{ stepper.current.title }}</h2>

    <ShippingForm v-if="stepper.current.id === 'shipping'" />
    <PaymentForm v-else-if="stepper.current.id === 'payment'" />
    <Review v-else :data="stepper.data" />

    <p v-for="(issue, index) in stepper.issues()" :key="index">{{ issue.message }}</p>

    <button type="button" :disabled="stepper.isFirst" @click="stepper.prev()">Back</button>
    <button type="button" @click="stepper.next(readForm())">
      {{ stepper.isLast ? "Place order" : "Continue" }}
    </button>
  </section>
</template>
```

`useStepper()` returns a reactive, read-only object: templates and `computed`
follow it, with no `.value`. Do not destructure its state, and watch a getter
(`watch(() => stepper.current.id, ...)`), not the object.

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
| `useStepper(options?)` | A flow owned by the component. Options can be an object, a ref or a getter. |
| `Provider`, `useStepperContext(selector?)` | One flow shared by the components below. A selector returns a `computed`. |
| `Stepper.*` | Accessible, unstyled primitives: `Root`, `List`, `Item`, `Trigger`, `Title`, `Description`, `Indicator`, `Content`, `Prev`, `Next`. |
| `create(options?)` | The same state machine without Vue, for tests, servers and stores. |

## Primitives

```vue
<script setup lang="ts">
const { Stepper } = checkout;
</script>

<template>
  <Stepper.Root linear @finish="placeOrder">
    <Stepper.List>
      <template #item>
        <Stepper.Item>
          <Stepper.Trigger>
            <Stepper.Indicator />
            <Stepper.Title />
          </Stepper.Trigger>
        </Stepper.Item>
      </template>
    </Stepper.List>

    <Stepper.Content step="shipping"><ShippingForm /></Stepper.Content>
    <Stepper.Content step="payment"><PaymentForm /></Stepper.Content>
    <Stepper.Content step="review"><Review /></Stepper.Content>

    <Stepper.Prev>Back</Stepper.Prev>
    <Stepper.Next>Continue</Stepper.Next>
  </Stepper.Root>
</template>
```

They handle roles, ids, keyboard navigation, focus and screen reader
announcements, expose their state through `data-*` attributes for styling, and
take `as-child` to render your own element. They work inside `<Transition>`,
focus included. `step` props are typed with your step ids, in templates and in
TSX (`v-slots` types the slots too).

If you only want the composables, import from `@stepperize/vue/headless`.

## Server rendering

Works in Nuxt and any Vue SSR setup with no configuration: the server renders
the current step, ids match on hydration, and no callback runs on the server.

## License

MIT

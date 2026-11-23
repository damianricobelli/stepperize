<script setup lang="ts">
import { ref } from "vue";
import { defineStepper } from "../index";

// What an application writes: a definition, then the primitives in a template.
const { Stepper } = defineStepper([
	{ id: "cart", title: "Cart" },
	{ id: "payment", title: "Payment" },
]);
const finished = ref("");
</script>

<template>
	<Stepper.Root v-slot="stepper" class="checkout" @finish="finished = 'done'">
		<output>{{ stepper.current.title }} {{ stepper.index + 1 }}/{{ stepper.steps.length }} {{ finished }}</output>
		<Stepper.List>
			<template #item="{ step }">
				<Stepper.Item v-slot="item">
					<Stepper.Trigger :data-nth="item.index">{{ step.title }}</Stepper.Trigger>
				</Stepper.Item>
			</template>
		</Stepper.List>
		<Stepper.Content step="cart">Cart form</Stepper.Content>
		<Stepper.Content step="payment" force-mount>Payment form</Stepper.Content>
		<!-- @vue-expect-error an unknown step id is a type error in templates too -->
		<Stepper.Content step="shipping" />
		<Stepper.Prev>Back</Stepper.Prev>
		<Stepper.Next as-child>
			<button type="submit">Continue</button>
		</Stepper.Next>
	</Stepper.Root>
</template>

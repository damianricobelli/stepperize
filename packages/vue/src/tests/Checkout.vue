<script lang="ts">
import { defineStepper } from "../index";

// What an application writes: the definition once, in module scope (or its own file), not per instance.
export const checkout = defineStepper([
	{ id: "cart", title: "Cart" },
	{ id: "payment", title: "Payment" },
]);
</script>

<script setup lang="ts">
import { ref } from "vue";

const { Stepper } = checkout;
const finished = ref("");
</script>

<template>
	<Stepper.Root v-slot="stepper" class="checkout" @finish="finished = 'done'">
		<Stepper.Item step="payment" as-child>
			<header>
				<Stepper.Title as-child><h2 class="heading" /></Stepper.Title>
			</header>
		</Stepper.Item>
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
		<!-- @vue-expect-error the stepper is read-only -->
		<button type="button" @click="stepper.index = 1">Cheat</button>
		<Stepper.Prev>Back</Stepper.Prev>
		<Stepper.Next as-child>
			<button type="submit">Continue</button>
		</Stepper.Next>
	</Stepper.Root>
</template>

<style scoped>
.heading {
	letter-spacing: 2px;
}
</style>

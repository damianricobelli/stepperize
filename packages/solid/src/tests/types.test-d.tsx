import type { Flow, Stepper } from "@stepperize/core";
import type { Accessor } from "solid-js";
import { expectTypeOf } from "vitest";
import { defineStepper as defineHeadless } from "../headless";
import { defineStepper, type ItemValue } from "../index";

const steps = [
	{ id: "cart", title: "Cart" },
	{ id: "review", title: "Review" },
] as const;
const flow = defineStepper(steps, { next: { cart: () => "review" } });

expectTypeOf(flow.create()).toEqualTypeOf<Flow<typeof steps>>();

export function Usage() {
	expectTypeOf(flow.useStepper()).toEqualTypeOf<Stepper<typeof steps>>();
	expectTypeOf(flow.useStepper(() => ({ linear: true }))).toEqualTypeOf<Stepper<typeof steps>>();
	expectTypeOf(flow.useStepperContext()).toEqualTypeOf<Stepper<typeof steps>>();
	expectTypeOf(flow.useStepperContext((s) => s.index)).toEqualTypeOf<Accessor<number>>();
	expectTypeOf(flow.Stepper.useItem()).toEqualTypeOf<ItemValue<typeof steps>>();
	expectTypeOf(flow.Stepper.useItem().step.id).toEqualTypeOf<"cart" | "review">();
	return (
		<flow.Stepper.Root linear onFinish={(data) => expectTypeOf(data.cart).toEqualTypeOf<unknown>()}>
			{(stepper) => (
				<>
					{stepper.current.id}
					<flow.Stepper.List orientation="vertical">
						{(step) => <flow.Stepper.Item>{(item) => `${step.title} ${item.state}`}</flow.Stepper.Item>}
					</flow.Stepper.List>
					<flow.Stepper.Item step="cart" as="div" />
					<flow.Stepper.Content step="cart" forceMount class="panel" />
					{/* @ts-expect-error unknown step id */}
					<flow.Stepper.Content step="payment" />
					{/* @ts-expect-error unknown step id */}
					<flow.Stepper.Item step="payment" />
					{/* @ts-expect-error not an orientation */}
					<flow.Stepper.List orientation="diagonal" />
				</>
			)}
		</flow.Stepper.Root>
	);
}

// The headless entry has the same flow API and no primitives.
const headless = defineHeadless(steps);
expectTypeOf(headless.useStepper).returns.toEqualTypeOf<Stepper<typeof steps>>();
// @ts-expect-error no primitives in the headless entry
headless.Stepper;

import type { Flow, Stepper } from "@stepperize/core";
import { expectTypeOf } from "vitest";
import { defineStepper as defineHeadless } from "../headless";
import { defineStepper } from "../index";

const steps = [
	{ id: "cart", title: "Cart" },
	{ id: "review", title: "Review" },
] as const;
const flow = defineStepper(steps, { next: { cart: () => "review" } });

expectTypeOf(flow.create()).toEqualTypeOf<Flow<typeof steps>>();

export function Usage() {
	expectTypeOf(flow.useStepper()).toEqualTypeOf<Stepper<typeof steps>>();
	expectTypeOf(flow.useStepperContext()).toEqualTypeOf<Stepper<typeof steps>>();
	expectTypeOf(flow.useStepperContext((s) => s.index)).toEqualTypeOf<number>();
	expectTypeOf(flow.Stepper.useItem().step.id).toEqualTypeOf<"cart" | "review">();
	return (
		<flow.Stepper.Root linear onFinish={(data) => expectTypeOf(data.cart).toEqualTypeOf<unknown>()}>
			{(stepper) => (
				<>
					{stepper.current.id}
					<flow.Stepper.List>{(step) => <flow.Stepper.Item>{step.title}</flow.Stepper.Item>}</flow.Stepper.List>
					<flow.Stepper.Content step="cart" />
					{/* @ts-expect-error unknown step id */}
					<flow.Stepper.Content step="payment" />
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

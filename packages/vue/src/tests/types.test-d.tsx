import type { Flow, Stepper } from "@stepperize/core";
import { expectTypeOf } from "vitest";
import type { ComputedRef } from "vue";
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
	expectTypeOf(flow.useStepper(() => ({ linear: true }))).toEqualTypeOf<Stepper<typeof steps>>();
	expectTypeOf(flow.useStepperContext()).toEqualTypeOf<Stepper<typeof steps>>();
	expectTypeOf(flow.useStepperContext((s) => s.index)).toEqualTypeOf<ComputedRef<number>>();
	expectTypeOf(flow.Stepper.useItem().value.step.id).toEqualTypeOf<"cart" | "review">();
	return (
		<flow.Stepper.Root linear onFinish={(data) => expectTypeOf(data.cart).toEqualTypeOf<unknown>()}>
			{{
				default: (stepper: Stepper<typeof steps>) => (
					<>
						{stepper.current.id}
						<flow.Stepper.List orientation="vertical">
							{{
								item: ({ step }: { step: (typeof steps)[number] }) => (
									<flow.Stepper.Item>{step.title}</flow.Stepper.Item>
								),
							}}
						</flow.Stepper.List>
						<flow.Stepper.Item step="cart" asChild />
						<flow.Stepper.Content step="cart" forceMount class="panel" />
						{/* @ts-expect-error unknown step id */}
						<flow.Stepper.Content step="payment" />
						{/* @ts-expect-error unknown step id */}
						<flow.Stepper.Item step="payment" />
						{/* @ts-expect-error not an orientation */}
						<flow.Stepper.List orientation="diagonal" />
					</>
				),
			}}
		</flow.Stepper.Root>
	);
}

// Slots are typed for templates: the Root hands out the stepper, the List its steps.
type SlotsOf<C> = C extends new () => { $slots: infer Slots } ? Slots : never;
expectTypeOf<Parameters<NonNullable<SlotsOf<typeof flow.Stepper.Root>["default"]>>[0]>().toEqualTypeOf<
	Stepper<typeof steps>
>();
expectTypeOf<Parameters<NonNullable<SlotsOf<typeof flow.Stepper.List>["item"]>>[0]["step"]["id"]>().toEqualTypeOf<
	"cart" | "review"
>();

// The headless entry has the same flow API and no primitives.
const headless = defineHeadless(steps);
expectTypeOf(headless.useStepper).returns.toEqualTypeOf<Stepper<typeof steps>>();
// @ts-expect-error no primitives in the headless entry
headless.Stepper;

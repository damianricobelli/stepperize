import type { Flow, StandardSchemaV1, Stepper } from "@stepperize/core";
import { expectTypeOf } from "vitest";
import type { ComputedRef } from "vue";
import { defineStepper as defineHeadless } from "../headless";
import type * as Api from "../index";
import { defineStepper, type ItemValue, type Primitives, type StepperComponent } from "../index";

const steps = [
	{ id: "cart", title: "Cart" },
	{ id: "review", title: "Review" },
] as const;
type Steps = typeof steps;
const flow = defineStepper(steps, { next: { cart: () => "review" } });

expectTypeOf(flow.create()).toEqualTypeOf<Flow<Steps>>();
// The primitives have a public, named type.
expectTypeOf(flow.Stepper).toEqualTypeOf<Primitives<Steps>>();
expectTypeOf(flow.Stepper.Root).toEqualTypeOf<
	StepperComponent<Api.RootProps<Steps>, Api.RootSlots<Steps>, HTMLDivElement>
>();
// @ts-expect-error renamed to StepperComponent: `Component` is Vue's name
export type Removed = Api.Component<object>;

// `$el` is what the instance really renders.
type El<C> = C extends new () => { $el: infer E } ? E : never;
expectTypeOf<El<typeof flow.Stepper.Root>>().toEqualTypeOf<HTMLDivElement>();
expectTypeOf<El<typeof flow.Stepper.Content>>().toEqualTypeOf<HTMLDivElement | Comment>();
expectTypeOf<El<typeof flow.Provider>>().toEqualTypeOf<Text | Comment>();

export function Usage() {
	const stepper = flow.useStepper();
	expectTypeOf(stepper).toEqualTypeOf<Readonly<Stepper<Steps>>>();
	expectTypeOf(flow.useStepper(() => ({ linear: true }))).toEqualTypeOf<Readonly<Stepper<Steps>>>();
	expectTypeOf(flow.useStepperContext()).toEqualTypeOf<Readonly<Stepper<Steps>>>();
	expectTypeOf(flow.useStepperContext((s) => s.index)).toEqualTypeOf<ComputedRef<number>>();
	expectTypeOf(flow.Stepper.useItem().value.step.id).toEqualTypeOf<"cart" | "review">();
	// The stepper is a view of the flow: assigning to it is a type error, as it is refused at runtime.
	// @ts-expect-error read-only
	stepper.index = 1;
	// @ts-expect-error read-only
	flow.useStepperContext().current = steps[0];
	return (
		<flow.Stepper.Root linear onFinish={(data) => expectTypeOf(data.cart).toEqualTypeOf<unknown>()}>
			{{
				default: (stepper: Readonly<Stepper<Steps>>) => (
					<>
						{stepper.current.id}
						<flow.Stepper.List orientation="vertical">
							{{
								item: ({ step }: { step: Steps[number] }) => <flow.Stepper.Item>{step.title}</flow.Stepper.Item>,
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

// TSX: `v-slots` infers every slot's parameters and rejects unknown slot names.
export function Slots() {
	return (
		<flow.Provider
			v-slots={{
				default: () => (
					<flow.Stepper.Root
						v-slots={{
							default: (stepper) => {
								expectTypeOf(stepper).toEqualTypeOf<Readonly<Stepper<Steps>>>();
								return (
									<flow.Stepper.List
										v-slots={{
											item: ({ step, index }) => {
												expectTypeOf(step.id).toEqualTypeOf<"cart" | "review">();
												expectTypeOf(index).toEqualTypeOf<number>();
												return (
													<flow.Stepper.Item
														v-slots={{
															default: (item) => {
																expectTypeOf(item).toEqualTypeOf<ItemValue<Steps>>();
																return <flow.Stepper.Trigger v-slots={{ default: () => item.step.title }} />;
															},
														}}
													/>
												);
											},
										}}
									/>
								);
							},
						}}
					/>
				),
			}}
		/>
	);
}

export function UnknownSlots() {
	return (
		<>
			{/* @ts-expect-error `items` is not a slot of List */}
			<flow.Stepper.List v-slots={{ items: () => null }} />
			{/* @ts-expect-error Title's default slot takes no parameters */}
			<flow.Stepper.Title v-slots={{ default: (value: string) => value }} />
		</>
	);
}

// Slots are typed for templates: the Root hands out the stepper, the List its steps.
type SlotsOf<C> = C extends new () => { $slots: infer Slots } ? Slots : never;
expectTypeOf<Parameters<NonNullable<SlotsOf<typeof flow.Stepper.Root>["default"]>>[0]>().toEqualTypeOf<
	Readonly<Stepper<Steps>>
>();
expectTypeOf<Parameters<NonNullable<SlotsOf<typeof flow.Stepper.List>["item"]>>[0]["step"]["id"]>().toEqualTypeOf<
	"cart" | "review"
>();

// A schema types each step's data (its input) and output, through the composable and the Root's props.
declare const email: StandardSchemaV1<{ email: string }, { email: string; verified: boolean }>;
const signup = defineStepper([{ id: "account", schema: email }, { id: "done" }]);
type Signup = typeof signup.steps;
export function Schemas() {
	const stepper = signup.useStepper({
		onFinish: (output, data) => {
			expectTypeOf(output.account).toEqualTypeOf<{ email: string; verified: boolean } | undefined>();
			expectTypeOf(data.account).toEqualTypeOf<{ email: string } | undefined>();
		},
	});
	expectTypeOf(stepper.data.account).toEqualTypeOf<{ email: string } | undefined>();
	expectTypeOf(stepper.output.account).toEqualTypeOf<{ email: string; verified: boolean } | undefined>();
	stepper.setData("account", { email: "a@b.c" });
	// @ts-expect-error the schema's input is an object with an email
	stepper.setData("account", { name: "Ada" });
	return (
		<signup.Stepper.Root
			next={{ account: (output) => (output.verified ? "done" : null) }}
			onChange={(snapshot) => expectTypeOf(snapshot.data).toEqualTypeOf<Api.FlowData<Signup>>()}
			onFinish={(output) => expectTypeOf(output.account?.verified).toEqualTypeOf<boolean | undefined>()}
		/>
	);
}

// The headless entry has the same flow API and no primitives.
const headless = defineHeadless(steps);
expectTypeOf(headless.useStepper).returns.toEqualTypeOf<Readonly<Stepper<Steps>>>();
// @ts-expect-error no primitives in the headless entry
headless.Stepper;

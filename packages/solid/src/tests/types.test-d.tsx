import type { Flow, StandardSchemaV1, Stepper } from "@stepperize/core";
import type { Accessor, JSX } from "solid-js";
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

/** `as` is polymorphic: the props and `ref` are those of what it renders. */
export function As() {
	const { Stepper } = flow;
	const Link = (props: JSX.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) => (
		<a href={props.to} {...props} />
	);
	const Bare = (_props: { required: number }) => <button type="button" />;
	return (
		<Stepper.Root>
			<Stepper.List>
				<Stepper.Item step="cart">
					{/* The default tag types `ref`. */}
					<Stepper.Trigger ref={(node) => expectTypeOf(node).toEqualTypeOf<HTMLButtonElement>()} />
					{/* A tag: its attributes are allowed and `ref` is that element. */}
					<Stepper.Trigger
						as="a"
						href="#cart"
						ref={(node) => expectTypeOf(node).toEqualTypeOf<HTMLAnchorElement>()}
						onClick={(event) => {
							const anchor: HTMLAnchorElement = event.currentTarget;
							return anchor;
						}}
					/>
					{/* @ts-expect-error `href` is not a button attribute */}
					<Stepper.Trigger href="#cart" />
					{/* A component: its own props are typed, and required. */}
					<Stepper.Trigger as={Link} to="/cart" ref={(node) => expectTypeOf(node).toEqualTypeOf<HTMLAnchorElement>()} />
					{/* @ts-expect-error `to` is required by `Link` */}
					<Stepper.Trigger as={Link} />
					{/* @ts-expect-error a component that cannot take `ref` cannot receive what the primitive hands it */}
					<Stepper.Trigger as={Bare} required={1} />
					{/* @ts-expect-error nor can one without props */}
					<Stepper.Next as={() => <button type="button" />} />
				</Stepper.Item>
				{/* Own props keep their step typing under any `as`. */}
				<Stepper.Item step="review" as="div" ref={(node) => expectTypeOf(node).toEqualTypeOf<HTMLDivElement>()} />
				{/* @ts-expect-error unknown step id with `as` */}
				<Stepper.Item step="payment" as="div" />
			</Stepper.List>
			<Stepper.List as="nav" ref={(node) => expectTypeOf(node).toEqualTypeOf<HTMLElement>()}>
				{(step, index) => {
					expectTypeOf(step.id).toEqualTypeOf<"cart" | "review">();
					expectTypeOf(index).toEqualTypeOf<number>();
					return <Stepper.Item />;
				}}
			</Stepper.List>
			<Stepper.Content step="cart" as="section" ref={(node) => expectTypeOf(node).toEqualTypeOf<HTMLElement>()} />
			{/* @ts-expect-error `step` is required on Content */}
			<Stepper.Content as="section" />
			<Stepper.Title as="h2" ref={(node) => expectTypeOf(node).toEqualTypeOf<HTMLHeadingElement>()} />
			<Stepper.Prev as="a" href="#back" />
		</Stepper.Root>
	);
}

/** Schemas type each step's data in, and what it produces out. */
type Schema<In, Out> = StandardSchemaV1<In, Out>;
declare const address: Schema<{ street: string }, { street: string; normalized: true }>;
declare const age: Schema<string, number>;
const typed = defineStepper([{ id: "address", schema: address }, { id: "age", schema: age }, { id: "done" }] as const);

export function Schemas() {
	const stepper = typed.useStepper({
		next: {
			address: (data) => {
				expectTypeOf(data).toEqualTypeOf<{ street: string; normalized: true }>();
				return "age";
			},
		},
		onFinish: (output, data) => {
			expectTypeOf(output.age).toEqualTypeOf<number | undefined>();
			expectTypeOf(data.age).toEqualTypeOf<string | undefined>();
		},
	});
	expectTypeOf(stepper.data.address).toEqualTypeOf<{ street: string } | undefined>();
	expectTypeOf(stepper.output.address).toEqualTypeOf<{ street: string; normalized: true } | undefined>();
	expectTypeOf(stepper.data.done).toEqualTypeOf<unknown>();
	stepper.setData("age", "42");
	// @ts-expect-error the input of `age` is a string
	stepper.setData("age", 42);
	stepper.match({
		address: (_step, data) => expectTypeOf(data).toEqualTypeOf<{ street: string } | undefined>(),
		age: (_step, data) => expectTypeOf(data).toEqualTypeOf<string | undefined>(),
		done: () => null,
	});
	return (
		<typed.Stepper.Root
			onFinish={(output) => expectTypeOf(output.address?.normalized).toEqualTypeOf<true | undefined>()}
		>
			{(root) => expectTypeOf(root.output.age).toEqualTypeOf<number | undefined>() && null}
		</typed.Stepper.Root>
	);
}

// The headless entry has the same flow API and no primitives.
const headless = defineHeadless(steps);
expectTypeOf(headless.useStepper).returns.toEqualTypeOf<Stepper<typeof steps>>();
// @ts-expect-error no primitives in the headless entry
headless.Stepper;

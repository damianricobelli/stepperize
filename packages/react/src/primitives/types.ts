import type { Id, Options, Step, Stepper, StepState } from "@stepperize/core";
import type React from "react";

/** Props a render function receives: spread them all, including `ref` and `children`. */
export type RenderProp<E extends React.ElementType> = (props: React.ComponentPropsWithRef<E>) => React.ReactNode;

export type PrimitiveProps<E extends React.ElementType> = Omit<React.ComponentPropsWithoutRef<E>, "children"> & {
	/** Render your own element. Spread the props you receive: they carry ARIA, ids, handlers and `ref`. */
	render?: RenderProp<E>;
	children?: React.ReactNode;
	ref?: React.Ref<React.ComponentRef<E>>;
};

export type Orientation = "horizontal" | "vertical";

/** `Stepper.Root` creates the flow: it accepts every flow option plus `div` props. */
export type RootProps<S extends readonly Step[]> = Omit<
	React.ComponentPropsWithoutRef<"div">,
	"children" | "onChange"
> &
	Options<S> & {
		orientation?: Orientation;
		ref?: React.Ref<HTMLDivElement>;
		/** Content, or a function receiving the current stepper. */
		children?: React.ReactNode | ((stepper: Stepper<S>) => React.ReactNode);
	};

export type ListProps<S extends readonly Step[]> = Omit<PrimitiveProps<"ol">, "children"> & {
	orientation?: Orientation;
	/** Content, or a function called once per step. Items inside it know their step. */
	children?: React.ReactNode | ((step: S[number], index: number) => React.ReactNode);
};

/** `step` is optional inside a `Stepper.List` function; otherwise pass a step id. */
export type ItemProps<S extends readonly Step[]> = PrimitiveProps<"li"> & { step?: Id<S> };

export type ContentProps<S extends readonly Step[]> = PrimitiveProps<"div"> & {
	step: Id<S>;
	/** Keep the panel mounted (and `hidden`) while its step is not current, so form state survives. */
	forceMount?: boolean;
};

/** What `Stepper.useItem()` returns for the enclosing `Stepper.Item`. */
export type ItemValue<S extends readonly Step[] = readonly Step[]> = {
	step: S[number];
	index: number;
	state: StepState;
	/** Its last validation failed and its data has not changed since. */
	invalid: boolean;
	/** `goTo` would be refused right now. */
	disabled: boolean;
	/** A move is running. Every step is `disabled` meanwhile. */
	pending: boolean;
};

export type Component<Props> = (props: Props) => React.ReactNode;

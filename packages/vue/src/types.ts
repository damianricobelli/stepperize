import type { Id, Options, Step, Stepper } from "@stepperize/core";
import type { ItemValue, Orientation } from "@stepperize/core/primitives";
import type {
	AllowedComponentProps,
	ButtonHTMLAttributes,
	HTMLAttributes,
	LiHTMLAttributes,
	OlHTMLAttributes,
	VNodeChild,
	VNodeProps,
} from "vue";

export type { ItemValue, Orientation };

type DefaultSlot<Props = never> = {
	default?: [Props] extends [never] ? () => VNodeChild : (props: Props) => VNodeChild;
};

/**
 * A Stepperize component as templates and TSX see it: typed props, typed slots
 * and the node it renders as `$el`.
 *
 * In TSX, pass slots through `v-slots` to have their parameters inferred and
 * their names checked: `<Stepper.Root v-slots={{ default: (stepper) => ... }} />`.
 * Children written as an object (`{{ default: ... }}`) are not type-checked by
 * TypeScript in Vue's JSX.
 */
export type StepperComponent<Props, Slots = DefaultSlot, El extends Node = HTMLElement> = new () => {
	$props: Props & AllowedComponentProps & VNodeProps & { "v-slots"?: Slots };
	$slots: Slots;
	/** The node it renders. With `as-child`, the element your child renders. */
	$el: El;
};

export type PrimitiveProps<Attributes = HTMLAttributes> = Attributes & {
	/**
	 * Render your own element or component instead of the default tag: the
	 * single child in the default slot receives the ARIA attributes, ids and
	 * handlers. An empty child is filled with what the primitive would show.
	 */
	asChild?: boolean;
};

/** `Stepper.Root` creates the flow: it accepts every flow option plus `div` attributes. */
export type RootProps<S extends readonly Step[]> = Omit<HTMLAttributes, "onChange"> &
	Options<S> & { orientation?: Orientation };

export type ListProps = PrimitiveProps<OlHTMLAttributes> & { orientation?: Orientation };

/** `step` is optional inside the `item` slot of a `Stepper.List`; otherwise pass a step id. */
export type ItemProps<S extends readonly Step[]> = PrimitiveProps<LiHTMLAttributes> & { step?: Id<S> };

export type ContentProps<S extends readonly Step[]> = PrimitiveProps & {
	step: Id<S>;
	/** Keep the panel mounted (and `hidden`) while its step is not current, so form state survives. */
	forceMount?: boolean;
};

export type ProviderSlots = DefaultSlot;

export type RootSlots<S extends readonly Step[]> = DefaultSlot<Readonly<Stepper<S>>>;

export type ListSlots<S extends readonly Step[]> = DefaultSlot & {
	/** Rendered once per step. Items inside it know their step. */
	item?: (props: { step: S[number]; index: number }) => VNodeChild;
};

export type ItemSlots<S extends readonly Step[]> = DefaultSlot<ItemValue<S>>;

export type ButtonProps = PrimitiveProps<ButtonHTMLAttributes>;

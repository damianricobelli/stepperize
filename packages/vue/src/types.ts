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

/** A component as templates and TSX see it: typed props and slots. `$el` is the element it renders. */
export type Component<Props, Slots = DefaultSlot, E extends Element = HTMLElement> = new () => {
	$props: Props & AllowedComponentProps & VNodeProps;
	$slots: Slots;
	$el: E;
};

export type PrimitiveProps<Attributes = HTMLAttributes> = Attributes & {
	/**
	 * Render your own element or component instead of the default tag: the
	 * single child in the default slot receives the ARIA attributes, ids and
	 * handlers.
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

export type RootSlots<S extends readonly Step[]> = DefaultSlot<Stepper<S>>;

export type ListSlots<S extends readonly Step[]> = DefaultSlot & {
	/** Rendered once per step. Items inside it know their step. */
	item?: (props: { step: S[number]; index: number }) => VNodeChild;
};

export type ItemSlots<S extends readonly Step[]> = DefaultSlot<ItemValue<S>>;

export type ButtonProps = PrimitiveProps<ButtonHTMLAttributes>;

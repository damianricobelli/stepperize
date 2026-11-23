import type { Id, Options, Step, Stepper } from "@stepperize/core";
import type { ItemValue, Orientation } from "@stepperize/core/primitives";
import type { Snippet } from "svelte";
import type {
	HTMLAttributes,
	HTMLButtonAttributes,
	HTMLLiAttributes,
	HTMLOlAttributes,
	KeyboardEventHandler,
	MouseEventHandler,
} from "svelte/elements";

export type { ItemValue, Orientation };

/** A value, or a function that returns it and is read again when the state it uses changes. */
export type MaybeGetter<T> = T | (() => T);

/**
 * What a primitive hands to its `child` snippet: ids, ARIA, `data-*`, its
 * handlers, the attributes you passed and an attachment that fills `ref`.
 * Typed for any element, so they spread onto an `<a>` as well as a `<button>`.
 */
export type ChildProps = HTMLAttributes<HTMLElement>;

/** The props of a button-like primitive (`Trigger`, `Prev`, `Next`). Its click handler is always there. */
export type ButtonChildProps = ChildProps & {
	onclick: MouseEventHandler<HTMLElement>;
	/** Natively disabled: only set when the step cannot be reached. Ignored by elements without `disabled`. */
	disabled?: boolean | null;
	type?: HTMLButtonAttributes["type"];
};

/** The props of `Stepper.List`. Its keyboard handler is always there. */
export type ListChildProps = ChildProps & { onkeydown: KeyboardEventHandler<HTMLElement> };

/**
 * Render your own element instead of the default tag. Spread `props` onto it:
 * they carry ARIA, ids and handlers, and fill the primitive's `ref`.
 *
 * @example
 * <Stepper.Next>
 *   {#snippet child({ props })}
 *     <MyButton {...props}>Continue</MyButton>
 *   {/snippet}
 * </Stepper.Next>
 */
export type ChildSnippet<Props extends ChildProps = ChildProps> = Snippet<[{ props: Props }]>;

/**
 * The props every primitive with an element shares.
 * `ref` is bindable: `bind:ref` gives you the element, whichever one received the props.
 */
export type PrimitiveProps<
	Attributes extends HTMLAttributes<any>,
	Element extends HTMLElement,
	Props extends ChildProps = ChildProps,
> = Omit<Attributes, "children"> & {
	/** The element: the default tag, or the one a `child` snippet spread the props onto. Use `bind:ref`. */
	ref?: Element | null;
	children?: Snippet;
	child?: ChildSnippet<Props>;
};

/** `Stepper.Root` creates the flow: it accepts every flow option plus `div` attributes. */
export type RootProps<S extends readonly Step[]> = Omit<HTMLAttributes<HTMLDivElement>, "children"> &
	Options<S> & {
		/** The `div`. Use `bind:ref`. */
		ref?: HTMLDivElement | null;
		orientation?: Orientation;
		/** Receives the stepper. Reactive: reading `current` does not follow a change of `data`, and so on. */
		children?: Snippet<[Stepper<S>]>;
	};

export type ProviderProps<S extends readonly Step[]> = Options<S> & { children?: Snippet };

export type ListProps<S extends readonly Step[]> = PrimitiveProps<
	HTMLOlAttributes,
	HTMLOListElement,
	ListChildProps
> & {
	orientation?: Orientation;
	/** Rendered once per step. Items inside it know their step. */
	item?: Snippet<[step: S[number], index: number]>;
};

/** `step` is optional inside the `item` snippet of a `Stepper.List`; otherwise pass a step id. */
export type ItemProps<S extends readonly Step[]> = Omit<PrimitiveProps<HTMLLiAttributes, HTMLLIElement>, "children"> & {
	step?: Id<S>;
	children?: Snippet<[ItemValue<S>]>;
};

export type ContentProps<S extends readonly Step[]> = PrimitiveProps<HTMLAttributes<HTMLDivElement>, HTMLDivElement> & {
	step: Id<S>;
	/** Keep the panel mounted (and `hidden`) while its step is not current, so form state survives. */
	forceMount?: boolean;
};

export type ButtonProps = PrimitiveProps<HTMLButtonAttributes, HTMLButtonElement, ButtonChildProps>;
export type TextProps = PrimitiveProps<HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;

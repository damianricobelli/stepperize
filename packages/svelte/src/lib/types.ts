import type { Id, Options, Step, Stepper } from "@stepperize/core";
import type { ItemValue, Orientation } from "@stepperize/core/primitives";
import type { Snippet } from "svelte";
import type { HTMLAttributes, HTMLButtonAttributes, HTMLLiAttributes, HTMLOlAttributes } from "svelte/elements";

export type { ItemValue, Orientation };

/** A value, or a function that returns it and is read again when the state it uses changes. */
export type MaybeGetter<T> = T | (() => T);

/**
 * Render your own element instead of the default tag. Spread `props` onto it:
 * they carry ARIA, ids and handlers.
 *
 * @example
 * <Stepper.Next>
 *   {#snippet child({ props })}
 *     <MyButton {...props}>Continue</MyButton>
 *   {/snippet}
 * </Stepper.Next>
 */
export type ChildSnippet = Snippet<[{ props: Record<string, unknown> }]>;

export type PrimitiveProps<Attributes = HTMLAttributes<HTMLElement>> = Omit<Attributes, "children"> & {
	children?: Snippet;
	child?: ChildSnippet;
};

/** `Stepper.Root` creates the flow: it accepts every flow option plus `div` attributes. */
export type RootProps<S extends readonly Step[]> = Omit<HTMLAttributes<HTMLDivElement>, "children"> &
	Options<S> & {
		orientation?: Orientation;
		/** Receives the stepper. Reactive: it only updates for what it reads. */
		children?: Snippet<[Stepper<S>]>;
	};

export type ProviderProps<S extends readonly Step[]> = Options<S> & { children?: Snippet };

export type ListProps<S extends readonly Step[]> = PrimitiveProps<HTMLOlAttributes> & {
	orientation?: Orientation;
	/** Rendered once per step. Items inside it know their step. */
	item?: Snippet<[step: S[number], index: number]>;
};

/** `step` is optional inside the `item` snippet of a `Stepper.List`; otherwise pass a step id. */
export type ItemProps<S extends readonly Step[]> = Omit<HTMLLiAttributes, "children"> & {
	step?: Id<S>;
	children?: Snippet<[ItemValue<S>]>;
	child?: ChildSnippet;
};

export type ContentProps<S extends readonly Step[]> = PrimitiveProps<HTMLAttributes<HTMLDivElement>> & {
	step: Id<S>;
	/** Keep the panel mounted (and `hidden`) while its step is not current, so form state survives. */
	forceMount?: boolean;
};

export type ButtonProps = PrimitiveProps<HTMLButtonAttributes>;
export type TextProps = PrimitiveProps<HTMLAttributes<HTMLSpanElement>>;

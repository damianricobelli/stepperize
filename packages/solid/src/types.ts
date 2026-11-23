import type { Id, Options, Step, Stepper } from "@stepperize/core";
import type { ItemValue, Orientation } from "@stepperize/core/primitives";
import type { JSX, ValidComponent } from "solid-js";

export type { ItemValue, Orientation };

/** A value, or a function that returns it and is read again when the signals it uses change. */
export type MaybeAccessor<T> = T | (() => T);

export type PrimitiveProps<Attributes = JSX.HTMLAttributes<HTMLElement>> = Omit<Attributes, "children"> & {
	/**
	 * Render your own element or component instead of the default tag. A
	 * component receives the ARIA attributes, ids, handlers and `ref` as props
	 * and must spread them onto an element.
	 */
	as?: ValidComponent;
	children?: JSX.Element;
};

/** `Stepper.Root` creates the flow: it accepts every flow option plus `div` attributes. */
export type RootProps<S extends readonly Step[]> = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> &
	Options<S> & {
		orientation?: Orientation;
		/** Content, or a function receiving the reactive stepper. */
		children?: JSX.Element | ((stepper: Stepper<S>) => JSX.Element);
	};

export type ProviderProps<S extends readonly Step[]> = Options<S> & { children?: JSX.Element };

export type ListProps<S extends readonly Step[]> = Omit<
	PrimitiveProps<JSX.OlHTMLAttributes<HTMLOListElement>>,
	"children"
> & {
	orientation?: Orientation;
	/** Content, or a function called once per step. Items inside it know their step. */
	children?: JSX.Element | ((step: S[number], index: number) => JSX.Element);
};

/** `step` is optional inside a `Stepper.List` function; otherwise pass a step id. */
export type ItemProps<S extends readonly Step[]> = Omit<
	PrimitiveProps<JSX.LiHTMLAttributes<HTMLLIElement>>,
	"children"
> & {
	step?: Id<S>;
	/** Content, or a function receiving the reactive item. */
	children?: JSX.Element | ((item: ItemValue<S>) => JSX.Element);
};

export type ContentProps<S extends readonly Step[]> = PrimitiveProps<JSX.HTMLAttributes<HTMLDivElement>> & {
	step: Id<S>;
	/** Keep the panel mounted (and `hidden`) while its step is not current, so form state survives. */
	forceMount?: boolean;
};

export type ButtonProps = PrimitiveProps<JSX.ButtonHTMLAttributes<HTMLButtonElement>>;
export type TextProps = PrimitiveProps<JSX.HTMLAttributes<HTMLSpanElement>>;

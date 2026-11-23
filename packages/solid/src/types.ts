import type { Id, Options, Step, Stepper } from "@stepperize/core";
import type { ItemValue, Orientation } from "@stepperize/core/primitives";
import type { ComponentProps, JSX, ValidComponent } from "solid-js";

export type { ItemValue, Orientation };

/** A value, or a function that returns it and is read again when the signals it uses change. */
export type MaybeAccessor<T> = T | (() => T);

/**
 * What `as` accepts: a tag, or a component whose props take `ref`. The primitive
 * hands it the ARIA attributes, ids, handlers and `ref`, and it must spread them
 * onto an element. A component that cannot take them (no props, or props without
 * `ref`) is a type error here instead of an inaccessible element at runtime.
 */
export type AsTarget<T extends ValidComponent> = T extends string
	? T
	: T extends () => JSX.Element
		? AsError
		: "ref" extends keyof ComponentProps<T>
			? T
			: AsError;

/** Shown in the type error for an `as` component that cannot receive what the primitive hands it. */
type AsError = "Stepper: an `as` component must accept `ref` and spread its props onto an element";

/**
 * The props of a primitive rendered as `T`: its own props, then every prop of
 * `T`. With `as="a"`, `href` is allowed and `ref` receives an `HTMLAnchorElement`;
 * with a component, its own props are typed and its required ones required.
 */
export type PolymorphicProps<T extends ValidComponent, Own = unknown> = Own &
	Omit<ComponentProps<T>, keyof Own | "as"> & {
		/** Render this tag or component instead of the default one. */
		as?: AsTarget<T>;
	};

/** A primitive that renders `Default` unless `as` names another tag or component. */
export type Polymorphic<Default extends ValidComponent, Own = unknown> = <T extends ValidComponent = Default>(
	props: PolymorphicProps<T, Own>,
) => JSX.Element;

/** `Stepper.Root` creates the flow: it accepts every flow option plus `div` attributes. */
export type RootProps<S extends readonly Step[]> = Omit<JSX.HTMLAttributes<HTMLDivElement>, "children" | "onChange"> &
	Options<S> & {
		orientation?: Orientation;
		/** Content, or a function of the reactive stepper. It must declare that parameter. */
		children?: JSX.Element | ((stepper: Stepper<S>) => JSX.Element);
	};

export type ProviderProps<S extends readonly Step[]> = Options<S> & { children?: JSX.Element };

export type ListOwnProps<S extends readonly Step[]> = {
	orientation?: Orientation;
	/**
	 * Content, or a function called once per step, which must declare the `step`
	 * parameter. Items inside it know their step. A function without parameters
	 * is content, like what `<For>` returns.
	 */
	children?: JSX.Element | ((step: S[number], index: number) => JSX.Element);
};

/** `step` is optional inside a `Stepper.List` function; otherwise pass a step id. */
export type ItemOwnProps<S extends readonly Step[]> = {
	step?: Id<S>;
	/** Content, or a function of the reactive item. It must declare that parameter. */
	children?: JSX.Element | ((item: ItemValue<S>) => JSX.Element);
};

export type ContentOwnProps<S extends readonly Step[]> = {
	step: Id<S>;
	/** Keep the panel mounted (and `hidden`) while its step is not current, so form state survives. */
	forceMount?: boolean;
};

export type ListProps<S extends readonly Step[], T extends ValidComponent = "ol"> = PolymorphicProps<
	T,
	ListOwnProps<S>
>;
export type ItemProps<S extends readonly Step[], T extends ValidComponent = "li"> = PolymorphicProps<
	T,
	ItemOwnProps<S>
>;
export type ContentProps<S extends readonly Step[], T extends ValidComponent = "div"> = PolymorphicProps<
	T,
	ContentOwnProps<S>
>;
export type ButtonProps<T extends ValidComponent = "button"> = PolymorphicProps<T>;
export type TextProps<T extends ValidComponent = "span"> = PolymorphicProps<T>;

import type { Step } from "@stepperize/core";
import type { ItemValue } from "@stepperize/core/primitives";
import type { Component } from "svelte";
import { bind, type Scope } from "../scope.js";
import type { ButtonProps, ContentProps, ItemProps, ListProps, RootProps, TextProps } from "../types.js";
import Content from "./Content.svelte";
import { useItem } from "./context.svelte.js";
import Indicator from "./Indicator.svelte";
import Item from "./Item.svelte";
import List from "./List.svelte";
import Nav from "./Nav.svelte";
import Root from "./Root.svelte";
import Text from "./Text.svelte";
import Trigger from "./Trigger.svelte";

/** A part with a bindable `ref` and no exports (`{}` is Svelte's own default for that). */
// biome-ignore lint/complexity/noBannedTypes: the exports type Svelte gives a component without any.
type Part<Props extends Record<string, any>> = Component<Props, {}, "ref">;

/**
 * Unstyled, accessible components bound to one flow, so `step` props are typed with its ids.
 * Every one with an element has a bindable `ref`: `bind:ref` gives you that element.
 */
export type Primitives<S extends readonly Step[]> = {
	Root: Part<RootProps<S>>;
	List: Part<ListProps<S>>;
	Item: Part<ItemProps<S>>;
	Trigger: Part<ButtonProps>;
	Title: Part<TextProps>;
	Description: Part<TextProps>;
	Indicator: Part<TextProps>;
	Content: Part<ContentProps<S>>;
	Prev: Part<ButtonProps>;
	Next: Part<ButtonProps>;
	/**
	 * The enclosing `Stepper.Item`: its step, index, state and whether it can be
	 * reached. Call it while the component initialises; the result is reactive.
	 */
	useItem: () => ItemValue<S>;
};

/** True only when each type is assignable to the other in every position. */
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type PropsOf<C> = C extends Component<infer Props, any, any> ? Props : never;
type BindingsOf<C> = C extends Component<any, any, infer Bindings> ? Bindings : never;
/** Every definition's parts at once: the components are written for any list of steps. */
type Wide = Primitives<readonly Step[]>;

/**
 * A component as its `.svelte` file types it (from its `$props()` and its
 * `$bindable`s) must be exactly its public type for the widest definition: a
 * prop added, removed or retyped on one side only, or a binding that is not
 * declared, fails to compile here, naming the part.
 */
const exact =
	<K extends Exclude<keyof Wide, "useItem">>(_part: K) =>
	<C extends Component<any, any, any>>(
		component: C &
			(Same<PropsOf<C>, PropsOf<Wide[K]>> extends true
				? Same<BindingsOf<C>, BindingsOf<Wide[K]>> extends true
					? unknown
					: { "bindable props differ from the public type": K }
				: { "$props() differs from the public type": K }),
	): Wide[K] =>
		component;

// Definition-independent parts are bound once.
const Title = exact("Title")(bind(Text, undefined, "title"));
const Description = exact("Description")(bind(Text, undefined, "description"));
const Mark = exact("Indicator")(bind(Indicator));

export function createPrimitives<S extends readonly Step[]>(scope: Scope<S>): Primitives<S> {
	const wide: Wide = {
		Root: exact("Root")(bind(Root, scope)),
		List: exact("List")(bind(List, scope)),
		Item: exact("Item")(bind(Item, scope)),
		Trigger: exact("Trigger")(bind(Trigger, scope)),
		Title,
		Description,
		Indicator: Mark,
		Content: exact("Content")(bind(Content, scope)),
		Prev: exact("Prev")(bind(Nav, scope, "prev")),
		Next: exact("Next")(bind(Nav, scope, "next")),
		useItem,
	};
	// The one narrowing TypeScript cannot prove: these components read `scope` at runtime,
	// so their step ids, snippets and callbacks are the ones of `S`.
	return wide as Primitives<S>;
}

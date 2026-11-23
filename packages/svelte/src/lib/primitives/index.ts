import type { Step } from "@stepperize/core";
import type { ItemValue } from "@stepperize/core/primitives";
import type { Component } from "svelte";
import { bind, type Scope } from "../scope";
import type { ButtonProps, ContentProps, ItemProps, ListProps, RootProps, TextProps } from "../types";
import Content from "./Content.svelte";
import { useItem } from "./context.svelte";
import Indicator from "./Indicator.svelte";
import Item from "./Item.svelte";
import List from "./List.svelte";
import Nav from "./Nav.svelte";
import Root from "./Root.svelte";
import Text from "./Text.svelte";
import Trigger from "./Trigger.svelte";

/** Unstyled, accessible components bound to one flow, so `step` props are typed with its ids. */
export type Primitives<S extends readonly Step[]> = {
	Root: Component<RootProps<S>>;
	List: Component<ListProps<S>>;
	Item: Component<ItemProps<S>>;
	Trigger: Component<ButtonProps>;
	Title: Component<TextProps>;
	Description: Component<TextProps>;
	Indicator: Component<TextProps>;
	Content: Component<ContentProps<S>>;
	Prev: Component<ButtonProps>;
	Next: Component<ButtonProps>;
	/**
	 * The enclosing `Stepper.Item`: its step, index, state and whether it can be
	 * reached. Call it while the component initialises; the result is reactive.
	 */
	useItem: () => ItemValue<S>;
};

const Title = bind<TextProps>(Text, undefined, "title");
const Description = bind<TextProps>(Text, undefined, "description");
const Mark = bind<TextProps>(Indicator);

export function createPrimitives<S extends readonly Step[]>(scope: Scope<S>): Primitives<S> {
	return {
		Root: bind(Root, scope),
		List: bind(List, scope),
		Item: bind(Item, scope),
		Trigger: bind(Trigger, scope),
		Title,
		Description,
		Indicator: Mark,
		Content: bind(Content, scope),
		Prev: bind(Nav, scope, "prev"),
		Next: bind(Nav, scope, "next"),
		useItem,
	};
}

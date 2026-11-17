import type { Step } from "@stepperize/core";
import type { Scope } from "../definition";
import { createContent } from "./content";
import { createItem, createList } from "./list";
import { createNav, createText, Indicator } from "./parts";
import { createRoot } from "./root";
import { useItem } from "./shared";
import { createTrigger } from "./trigger";
import type { Component, ContentProps, ItemProps, ItemValue, ListProps, PrimitiveProps, RootProps } from "./types";

/** Unstyled, accessible components bound to one flow, so `step` props are typed with its ids. */
export type Primitives<S extends readonly Step[]> = {
	Root: Component<RootProps<S>>;
	List: Component<ListProps<S>>;
	Item: Component<ItemProps<S>>;
	Trigger: Component<PrimitiveProps<"button">>;
	Title: Component<PrimitiveProps<"span">>;
	Description: Component<PrimitiveProps<"span">>;
	Indicator: Component<PrimitiveProps<"span">>;
	Content: Component<ContentProps<S>>;
	Prev: Component<PrimitiveProps<"button">>;
	Next: Component<PrimitiveProps<"button">>;
	/** The enclosing `Stepper.Item`: its step, index, state and whether it can be reached. */
	useItem: () => ItemValue<S>;
};

const Title = createText("title");
const Description = createText("description");

export function createPrimitives<S extends readonly Step[]>(scope: Scope<S>): Primitives<S> {
	return {
		Root: createRoot(scope),
		List: createList(scope),
		Item: createItem(scope),
		Trigger: createTrigger(scope),
		Title,
		Description,
		Indicator,
		Content: createContent(scope),
		Prev: createNav("prev", scope),
		Next: createNav("next", scope),
		useItem,
	};
}

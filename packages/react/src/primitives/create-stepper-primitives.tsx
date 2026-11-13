import type { Step, StepMap } from "@stepperize/core";
import type React from "react";
import { createContent } from "./content";
import type { StepItemValue, StepperScope } from "./context";
import { createItem } from "./item";
import { createItems } from "./items";
import { createList } from "./list";
import { createNav } from "./nav";
import { createRoot } from "./root";
import { createSeparator, createSimple, fromStep, withStatus } from "./simple";
import { createTrigger } from "./trigger";
import type {
	ActionsProps,
	ContentProps,
	DescriptionProps,
	IndicatorProps,
	ItemProps,
	ItemsProps,
	ListProps,
	NextProps,
	PrevProps,
	PrimitiveComponent,
	RootProps,
	SeparatorProps,
	TitleProps,
	TriggerProps,
} from "./types";

export type StepperPrimitives<Steps extends readonly Step[]> = {
	Root: PrimitiveComponent<RootProps<Steps>>;
	List: PrimitiveComponent<ListProps>;
	Items: PrimitiveComponent<ItemsProps<Steps>>;
	Item: PrimitiveComponent<ItemProps<Steps>>;
	Trigger: PrimitiveComponent<TriggerProps>;
	Title: PrimitiveComponent<TitleProps>;
	Description: PrimitiveComponent<DescriptionProps>;
	Indicator: PrimitiveComponent<IndicatorProps>;
	Separator: PrimitiveComponent<SeparatorProps>;
	Content: PrimitiveComponent<ContentProps<Steps>>;
	Actions: PrimitiveComponent<ActionsProps>;
	Prev: PrimitiveComponent<PrevProps>;
	Next: PrimitiveComponent<NextProps>;
	/**
	 * Read the enclosing `Stepper.Item`: its step, index, status, completion and
	 * whether it can be reached. Build custom indicators and triggers without
	 * parsing data attributes.
	 */
	useItem: () => StepItemValue<Steps[number]>;
};

// Inside a Trigger (a <button>), headings and paragraphs are invalid: use phrasing content.
const titleTag = (inTrigger: boolean) => (inTrigger ? "span" : "h4") as "h4";
const descriptionTag = (inTrigger: boolean) => (inTrigger ? "span" : "p") as "p";

export function createStepperPrimitives<Steps extends readonly Step[]>(
	map: StepMap<Steps>,
	Provider: (props: React.PropsWithChildren<any>) => React.ReactElement,
	scope: StepperScope<Steps>,
): StepperPrimitives<Steps> {
	return {
		Root: createRoot<Steps>(Provider, scope),
		List: createList<Steps>(scope),
		Items: createItems(map.steps, scope),
		Item: createItem(map, scope),
		Trigger: createTrigger<Steps>(scope),
		Title: createSimple("title", titleTag, fromStep("title"), false, scope),
		Description: createSimple("description", descriptionTag, fromStep("description"), false, scope),
		Indicator: createSimple("indicator", "span", withStatus, true, scope),
		Separator: createSeparator(scope.UiContext),
		Content: createContent<Steps>(map, scope),
		Actions: createSimple("actions", "div", undefined, false, scope),
		Prev: createNav<Steps>("prev", scope),
		Next: createNav<Steps>("next", scope),
		useItem: scope.useStepItem as () => StepItemValue<Steps[number]>,
	};
}

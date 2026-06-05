import type { Step, Stepper } from "@stepperize/core";
import type React from "react";
import { createActions } from "./actions";
import { createContent } from "./content";
import { createDescription } from "./description";
import { createIndicator } from "./indicator";
import { createItem } from "./item";
import { createItems } from "./items";
import { createList } from "./list";
import { createNext } from "./next";
import { createPrev } from "./prev";
import { createRoot } from "./root";
import { createSeparator } from "./separator";
import { createTitle } from "./title";
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
};

export function createStepperPrimitives<Steps extends readonly Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
	Provider: (props: React.PropsWithChildren<any>) => React.ReactElement,
): StepperPrimitives<Steps> {
	return {
		Root: createRoot(StepperContext, Provider),
		List: createList(StepperContext),
		Items: createItems(StepperContext),
		Item: createItem(StepperContext),
		Trigger: createTrigger(StepperContext),
		Title: createTitle(),
		Description: createDescription(),
		Indicator: createIndicator(),
		Separator: createSeparator(),
		Content: createContent(StepperContext),
		Actions: createActions(),
		Prev: createPrev(StepperContext),
		Next: createNext(StepperContext),
	};
}

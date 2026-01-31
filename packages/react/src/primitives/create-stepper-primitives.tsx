import * as React from "react";
import type { Step, Stepper, Utils } from "@stepperize/core";
import { createRoot } from "./root";
import { createList } from "./list";
import { createItem } from "./item";
import { createTrigger } from "./trigger";
import { createTitle } from "./title";
import { createDescription } from "./description";
import { createIndicator } from "./indicator";
import { createSeparator } from "./separator";
import { createContent } from "./content";
import { createActions } from "./actions";
import { createPrev } from "./prev";
import { createNext } from "./next";

export type StepperPrimitives<Steps extends Step[]> = {
	Root: ReturnType<typeof createRoot<Steps>>;
	List: ReturnType<typeof createList<Steps>>;
	Item: ReturnType<typeof createItem<Steps>>;
	Trigger: ReturnType<typeof createTrigger<Steps>>;
	Title: ReturnType<typeof createTitle>;
	Description: ReturnType<typeof createDescription<Steps>>;
	Indicator: ReturnType<typeof createIndicator<Steps>>;
	Separator: ReturnType<typeof createSeparator>;
	Content: ReturnType<typeof createContent<Steps>>;
	Actions: ReturnType<typeof createActions>;
	Prev: ReturnType<typeof createPrev<Steps>>;
	Next: ReturnType<typeof createNext<Steps>>;
};

export function createStepperPrimitives<Steps extends Step[]>(
	StepperContext: React.Context<Stepper<Steps> | null>,
	utils: Utils<Steps>,
): StepperPrimitives<Steps> {
	return {
		Root: createRoot(StepperContext),
		List: createList(),
		Item: createItem(StepperContext, utils),
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

import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import type React from "react";
import { createActions } from "./actions";
import { createContent } from "./content";
import { createDescription } from "./description";
import { createIndicator } from "./indicator";
import { createItem } from "./item";
import { createList } from "./list";
import { createNext } from "./next";
import { createPrev } from "./prev";
import { createRoot } from "./root";
import { createSeparator } from "./separator";
import { createTitle } from "./title";
import { createTrigger } from "./trigger";

export type StepperPrimitives<Steps extends Step[]> = {
  Root: ReturnType<typeof createRoot<Steps>>;
  List: ReturnType<typeof createList>;
  Item: ReturnType<typeof createItem<Steps>>;
  Trigger: ReturnType<typeof createTrigger<Steps>>;
  Title: ReturnType<typeof createTitle>;
  Description: ReturnType<typeof createDescription>;
  Indicator: ReturnType<typeof createIndicator>;
  Separator: ReturnType<typeof createSeparator>;
  Content: ReturnType<typeof createContent<Steps>>;
  Actions: ReturnType<typeof createActions>;
  Prev: ReturnType<typeof createPrev<Steps>>;
  Next: ReturnType<typeof createNext<Steps>>;
};

export type ScopedProviderProps<Steps extends Step[]> =
  React.PropsWithChildren<{
    initialStep?: Get.Id<Steps>;
    initialMetadata?: Partial<Record<Get.Id<Steps>, Metadata>>;
  }>;

export function createStepperPrimitives<Steps extends Step[]>(
  StepperContext: React.Context<Stepper<Steps> | null>,
  ScopedProvider: (props: ScopedProviderProps<Steps>) => React.ReactElement,
): StepperPrimitives<Steps> {
  return {
    Root: createRoot(StepperContext, ScopedProvider),
    List: createList(StepperContext),
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

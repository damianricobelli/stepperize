import type { Get, Metadata, Step, Stepper } from "@stepperize/core";
import React from "react";
import { StepItemProvider, type StepItemValue } from "./context";
import type { ItemProps, StepStatus } from "./types";

export function createItem<Steps extends Step[]>(
  StepperContext: React.Context<Stepper<Steps> | null>,
) {
  return function Item(props: ItemProps<Steps>) {
    const { step, render, children, ...rest } = props;
    const stepper = React.useContext(StepperContext);
    if (!stepper) {
      throw new Error("Stepper.Item must be used within Stepper.Root.");
    }
    const stepIndex = stepper.lookup.getIndex(step);
    const currentIndex = stepper.state.current.index;
    const status: StepStatus =
      stepIndex < currentIndex
        ? "success"
        : stepIndex === currentIndex
          ? "active"
          : "inactive";
    const stepData = stepper.lookup.get(step as Get.Id<Steps>);
    const itemValue = React.useMemo(
      (): StepItemValue<Get.StepById<Steps, Get.Id<Steps>>> => ({
        data: stepData,
        index: stepIndex,
        status,
        metadata: {
          get: () => stepper.metadata.get(step as Get.Id<Steps>),
          set: <M extends Metadata>(values: M) =>
            stepper.metadata.set(step as Get.Id<Steps>, values),
          reset: (keepInitialMetadata?: boolean) =>
            stepper.metadata.reset(keepInitialMetadata),
        },
      }),
      [step, stepData, stepIndex, status, stepper],
    );
    const domProps = {
      "data-component": "stepper-item",
      "data-status": status,
      ...rest,
    };
    if (render) {
      <StepItemProvider value={itemValue}>{render(domProps)}</StepItemProvider>;
    }
    return (
      <StepItemProvider value={itemValue}>
        <li {...domProps}>{children}</li>
      </StepItemProvider>
    );
  };
}

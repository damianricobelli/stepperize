import type { Step, Stepper } from "@stepperize/core";
import React from "react";
import type { RootProps } from "./types";

type ScopedProviderProps<Steps extends Step[]> = React.PropsWithChildren<{
  initialStep?: RootProps<Steps>["initialStep"];
  initialMetadata?: RootProps<Steps>["initialMetadata"];
}>;

export function createRoot<Steps extends Step[]>(
  StepperContext: React.Context<Stepper<Steps> | null>,
  ScopedProvider: (props: ScopedProviderProps<Steps>) => React.ReactElement,
) {
  function RootInner({
    children,
    orientation,
    ...rest
  }: Omit<RootProps<Steps>, "initialStep" | "initialMetadata">) {
    const stepper = React.useContext(StepperContext);
    if (!stepper) {
      throw new Error("Stepper.Root must be used within Scoped.");
    }
    return React.createElement(
      "div",
      {
        "data-component": "stepper",
        "data-orientation": orientation,
        role: "group",
        "aria-label": "Stepper",
        ...rest,
      },
      typeof children === "function" ? children({ stepper }) : children,
    );
  }

  return function Root(props: RootProps<Steps>) {
    const { initialStep, initialMetadata, children, ...rootInnerProps } = props;
    return (
      <ScopedProvider
        initialStep={initialStep}
        initialMetadata={initialMetadata}
      >
        <RootInner
          {...(rootInnerProps as Omit<
            RootProps<Steps>,
            "initialStep" | "initialMetadata"
          >)}
        >
          {children}
        </RootInner>
      </ScopedProvider>
    );
  };
}

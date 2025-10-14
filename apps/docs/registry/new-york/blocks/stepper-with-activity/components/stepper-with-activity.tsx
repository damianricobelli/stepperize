"use client";

import * as React from "react";

import { defineStepper } from "@/registry/new-york/blocks/stepper-with-activity/components/ui/stepper";
import { Button } from "@/registry/new-york/ui/button";

const { Stepper, useStepper } = defineStepper(
  {
    id: "step-1",
    title: "Step 1",
  },
  {
    id: "step-2",
    title: "Step 2",
  },
  {
    id: "step-3",
    title: "Step 3",
  }
);

export function StepperWithActivity() {
  return (
    <Stepper.Provider className="space-y-4" variant="horizontal">
      {({ methods }) => (
        <React.Fragment>
          <Stepper.Navigation>
            {methods.all.map((step) => (
              <Stepper.Step
                key={step.id}
                of={step.id}
                onClick={() => methods.goTo(step.id)}
              >
                <Stepper.Title>{step.title}</Stepper.Title>
              </Stepper.Step>
            ))}
          </Stepper.Navigation>
          <Wrapper />
          <Stepper.Controls>
            {!methods.isLast && (
              <Button
                type="button"
                variant="secondary"
                onClick={methods.prev}
                disabled={methods.isFirst}
              >
                Previous
              </Button>
            )}
            <Button onClick={methods.isLast ? methods.reset : methods.next}>
              {methods.isLast ? "Reset" : "Next"}
            </Button>
          </Stepper.Controls>
        </React.Fragment>
      )}
    </Stepper.Provider>
  );
}

const Wrapper = () => {
  const { current } = useStepper();

  return (
    <>
      <React.Activity mode={current.id === "step-1" ? "visible" : "hidden"}>
        <Content id={current.id} />
      </React.Activity>
      <React.Activity mode={current.id === "step-2" ? "visible" : "hidden"}>
        <Content id={current.id} />
      </React.Activity>
      <React.Activity mode={current.id === "step-3" ? "visible" : "hidden"}>
        <Content id={current.id} />
      </React.Activity>
    </>
  );
};

const Content = ({ id }: { id: string }) => {
  return (
    <Stepper.Panel className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8">
      <p className="text-xl font-normal">Content for {id}</p>
    </Stepper.Panel>
  );
};

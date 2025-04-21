"use client";

import * as React from "react";

import { Button } from "@/registry/new-york/ui/button";
import { Label } from "@/registry/new-york/ui/label";
import { RadioGroup, RadioGroupItem } from "@/registry/new-york/ui/radio-group";
import { defineStepper } from "@/registry/new-york/ui/stepper";

const { Stepper } = defineStepper(
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
  },
  {
    id: "step-4",
    title: "Step 4",
  },
  {
    id: "step-5",
    title: "Step 5",
  },
  {
    id: "step-6",
    title: "Step 6",
  }
);

export default function StepperWithTracking() {
  const [tracking, setTracking] = React.useState(false);
  return (
    <div className="flex w-full flex-col gap-8">
      <RadioGroup
        value={tracking.toString()}
        onValueChange={(value) => setTracking(value === "true")}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="true" id="tracking" />
          <Label htmlFor="tracking">Tracking</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="false" id="no-tracking" />
          <Label htmlFor="no-tracking">No Tracking</Label>
        </div>
      </RadioGroup>
      <Stepper.Provider
        className="space-y-4"
        variant="vertical"
        tracking={tracking}
      >
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
                  {methods.when(step.id, () => (
                    <Stepper.Panel className="space-y-4">
                      <div className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8">
                        <p className="text-xl font-normal">
                          Content for {step.id}
                        </p>
                      </div>
                      <Stepper.Controls>
                        {!methods.isLast && (
                          <Button
                            variant="secondary"
                            onClick={methods.prev}
                            disabled={methods.isFirst}
                          >
                            Previous
                          </Button>
                        )}
                        <Button
                          onClick={
                            methods.isLast ? methods.reset : methods.next
                          }
                        >
                          {methods.isLast ? "Reset" : "Next"}
                        </Button>
                      </Stepper.Controls>
                    </Stepper.Panel>
                  ))}
                </Stepper.Step>
              ))}
            </Stepper.Navigation>
          </React.Fragment>
        )}
      </Stepper.Provider>
    </div>
  );
}

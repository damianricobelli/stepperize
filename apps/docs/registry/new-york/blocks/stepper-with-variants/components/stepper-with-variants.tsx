"use client";

import * as React from "react";

import { defineStepper } from "@/registry/new-york/blocks/stepper-with-variants/components/ui/stepper";
import { Button } from "@/registry/new-york/ui/button";
import { Label } from "@/registry/new-york/ui/label";
import { RadioGroup, RadioGroupItem } from "@/registry/new-york/ui/radio-group";

type Variant = "horizontal" | "vertical" | "circle";

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
  }
);

export function StepperWithVariants() {
  const [variant, setVariant] = React.useState<Variant>("horizontal");
  return (
    <div className="flex w-full flex-col gap-8">
      <RadioGroup
        value={variant}
        onValueChange={(value) => setVariant(value as Variant)}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="horizontal" id="horizontal-variant" />
          <Label htmlFor="horizontal-variant">Horizontal</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="vertical" id="vertical-variant" />
          <Label htmlFor="vertical-variant">Vertical</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="circle" id="circle-variant" />
          <Label htmlFor="circle-variant">Circle</Label>
        </div>
      </RadioGroup>
      {variant === "horizontal" && <HorizontalStepper />}
      {variant === "vertical" && <VerticalStepper />}
      {variant === "circle" && <CircleStepper />}
    </div>
  );
}

const HorizontalStepper = () => {
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
          {methods.switch({
            "step-1": (step) => <Content id={step.id} />,
            "step-2": (step) => <Content id={step.id} />,
            "step-3": (step) => <Content id={step.id} />,
          })}
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
};

const Content = ({ id }: { id: string }) => {
  return (
    <Stepper.Panel className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8">
      <p className="text-xl font-normal">Content for {id}</p>
    </Stepper.Panel>
  );
};

const VerticalStepper = () => {
  return (
    <Stepper.Provider className="space-y-4" variant="vertical">
      {({ methods }) => (
        <>
          <Stepper.Navigation>
            {methods.all.map((step) => (
              <Stepper.Step
                key={step.id}
                of={step.id}
                onClick={() => methods.goTo(step.id)}
              >
                <Stepper.Title>{step.title}</Stepper.Title>
                {methods.when(step.id, () => (
                  <Stepper.Panel className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8">
                    <p className="text-xl font-normal">Content for {step.id}</p>
                  </Stepper.Panel>
                ))}
              </Stepper.Step>
            ))}
          </Stepper.Navigation>
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
        </>
      )}
    </Stepper.Provider>
  );
};

const CircleStepper = () => {
  return (
    <Stepper.Provider className="space-y-4" variant="circle">
      {({ methods }) => (
        <React.Fragment>
          <Stepper.Navigation>
            <Stepper.Step of={methods.current.id}>
              <Stepper.Title>{methods.current.title}</Stepper.Title>
            </Stepper.Step>
          </Stepper.Navigation>
          {methods.when(methods.current.id, () => (
            <Stepper.Panel className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8">
              <p className="text-xl font-normal">
                Content for {methods.current.id}
              </p>
            </Stepper.Panel>
          ))}
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
};

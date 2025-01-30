"use client";

import { Button } from "@/components/ui/button";
import { defineStepper } from "@stepperize/react";

const { useStepper } = defineStepper(
  {
    id: "first",
    title: "Step 1",
    description: "This is the content for step 1.",
  },
  {
    id: "second",
    title: "Step 2",
    description: "This is the content for step 2.",
  },
  {
    id: "third",
    title: "Step 3",
    description: "This is the content for step 3.",
  },
  {
    id: "last",
    title: "Step 4",
    description: "This is the content for step 4.",
  }
);

export function HeroStepper() {
  const stepper = useStepper();
  return (
    <div className="p-6 shadow-lg border rounded-lg">
      <h3 className="text-lg font-semibold mb-2">{stepper.current.title}</h3>
      <p className="text-muted-foreground mb-4">
        {stepper.current.description}
      </p>
      <div className="flex justify-between">
        {!stepper.isLast ? (
          <>
            <Button onClick={stepper.prev} disabled={stepper.isFirst}>
              Previous
            </Button>

            <Button onClick={stepper.next}>
              {stepper.when(
                "third",
                () => "Finish",
                () => "Next"
              )}
            </Button>
          </>
        ) : (
          <Button onClick={stepper.reset}>Reset</Button>
        )}
      </div>
    </div>
  );
}

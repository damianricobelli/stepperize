"use client";

import { defineStepper } from "@stepperize/react";
import { useStepItemContext } from "@stepperize/react/primitives";
import React from "react";

const { Stepper } = defineStepper(
  { id: "a", title: "First" },
  { id: "b", title: "Second" },
  { id: "c", title: "Third" },
);

function StepNumber() {
  const item = useStepItemContext();
  return <span>{item.index + 1}</span>;
}

function Trigger({ children }: { children: React.ReactNode }) {
  return (
    <Stepper.Trigger className="rounded-full border border-gray-300 bg-white px-2 py-1 text-sm leading-tight dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 data-[status=active]:bg-blue-100 dark:data-[status=active]:bg-blue-900/40 dark:data-[status=active]:text-blue-200">
      {children}
    </Stepper.Trigger>
  );
}

export function BasicCustomIndicatorPreview() {
  return (
    <div className="w-full rounded-lg border border-gray-100 px-4 pb-6">
      <Stepper.Root>
        {({ stepper }) => (
          <>
            <Stepper.List className="m-0 flex list-none flex-wrap gap-2 p-0">
              {stepper.state.all.map((step) => (
                <React.Fragment key={step.id}>
                  <Stepper.Item step={step.id}>
                    <Trigger>
                      <Stepper.Indicator className="inline-flex size-4 items-center justify-center rounded-full bg-inherit text-xs font-semibold">
                        <StepNumber />
                      </Stepper.Indicator>
                      <Stepper.Title
                        render={(props) => <span {...props}>{step.title}</span>}
                      />
                    </Trigger>
                  </Stepper.Item>
                  {step.id !== "c" && (
                    <span className="self-center text-gray-400 dark:text-gray-500">
                      →
                    </span>
                  )}
                </React.Fragment>
              ))}
            </Stepper.List>
            <div className="mt-4 min-h-10 text-gray-900 dark:text-gray-100">
              <Stepper.Content step="a">
                <p className="m-0">First step content</p>
              </Stepper.Content>
              <Stepper.Content step="b">
                <p className="m-0">Second step content</p>
              </Stepper.Content>
              <Stepper.Content step="c">
                <p className="m-0">Third step content</p>
              </Stepper.Content>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {stepper.state.isLast ? (
                <button
                  type="button"
                  onClick={() => stepper.navigation.reset()}
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                >
                  Reset
                </button>
              ) : (
                <>
                  <Stepper.Prev className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100">
                    Previous
                  </Stepper.Prev>
                  <Stepper.Next className="rounded border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm leading-tight text-white dark:border-blue-400 dark:bg-blue-600 dark:text-white">
                    Next
                  </Stepper.Next>
                </>
              )}
            </div>
          </>
        )}
      </Stepper.Root>
    </div>
  );
}

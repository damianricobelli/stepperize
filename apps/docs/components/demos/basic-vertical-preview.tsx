"use client";

import * as React from "react";
import { defineStepper } from "@stepperize/react";

const { Stepper } = defineStepper(
  { id: "one", title: "Step 1" },
  { id: "two", title: "Step 2" },
  { id: "three", title: "Step 3" },
);

function Trigger({ children }: { children: React.ReactNode }) {
  return (
    <Stepper.Trigger className="border border-gray-300 bg-white px-2 py-1 text-sm leading-tight dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 data-[status=active]:bg-blue-100 dark:data-[status=active]:bg-blue-900/40 dark:data-[status=active]:text-blue-200">
      {children}
    </Stepper.Trigger>
  );
}

function VerticalLine() {
  return <div className="ml-3 h-3 w-px bg-gray-300 dark:bg-gray-600" />;
}

export function BasicVerticalPreview() {
  return (
    <div className="w-full rounded-lg border border-gray-100 px-4 pb-6">
      <Stepper.Root orientation="vertical">
        {({ stepper }) => (
          <>
            <Stepper.List
              orientation="vertical"
              className="m-0 flex w-fit list-none flex-col items-stretch gap-0 p-0"
            >
              {stepper.state.all.map((step, index) => (
                <React.Fragment key={step.id}>
                  <Stepper.Item step={step.id}>
                    <Trigger>
                      <Stepper.Title render={(props) => <span {...props}>{step.title}</span>} />
                    </Trigger>
                  </Stepper.Item>
                  {index < stepper.state.all.length - 1 && <VerticalLine />}
                </React.Fragment>
              ))}
            </Stepper.List>
            <div className="mt-4 min-h-10 text-gray-900 dark:text-gray-100">
              {stepper.state.all.map((step) => (
                <Stepper.Content key={step.id} step={step.id}>
                  <p className="m-0">Content for {step.title}</p>
                </Stepper.Content>
              ))}
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
                    Back
                  </Stepper.Prev>
                  <Stepper.Next className="rounded border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm leading-tight text-white dark:border-blue-400 dark:bg-blue-600 dark:text-white">
                    Continue
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

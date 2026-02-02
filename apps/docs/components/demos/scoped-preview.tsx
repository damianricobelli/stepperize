"use client";

import * as React from "react";
import { defineStepper } from "@stepperize/react";

const { Scoped, useStepper } = defineStepper(
  { id: "info", title: "Info" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
);

function StepContent() {
  const stepper = useStepper();
  return (
    <div>
      <p className="m-0 text-sm text-gray-600 dark:text-gray-400">
        Current: <strong>{stepper.state.current.data.title}</strong>
      </p>
      <div className="min-h-10 text-gray-900 dark:text-gray-100">
        {stepper.flow.switch({
          info: () => <p className="m-0">Enter your info.</p>,
          review: () => <p className="m-0">Review your data.</p>,
          done: () => <p className="m-0">All done!</p>,
        })}
      </div>
    </div>
  );
}

function StepNavigation() {
  const stepper = useStepper();
  return (
    <div className="mt-4 flex gap-2">
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
          {!stepper.state.isFirst && (
            <button
              type="button"
              onClick={() => stepper.navigation.prev()}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={() => stepper.navigation.next()}
            className="rounded border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm leading-tight text-white dark:border-blue-600 dark:text-white"
          >
            Next
          </button>
        </>
      )}
    </div>
  );
}

export function ScopedPreview() {
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <Scoped>
        <StepContent />
        <StepNavigation />
      </Scoped>
    </div>
  );
}

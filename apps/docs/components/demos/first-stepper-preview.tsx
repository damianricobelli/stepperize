"use client";

import * as React from "react";
import { defineStepper } from "@stepperize/react";

const { useStepper } = defineStepper(
  { id: "name", title: "Name" },
  { id: "email", title: "Email" },
  { id: "confirm", title: "Confirm" },
  { id: "done", title: "Done" },
);

export function FirstStepperPreview() {
  const stepper = useStepper();
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <p className="m-0 text-sm text-gray-600 dark:text-gray-400">
        Step: <strong>{stepper.state.current.data.title}</strong>
      </p>
      <div className="min-h-10 text-gray-900 dark:text-gray-100">
        {stepper.flow.switch({
          name: () => <p className="m-0">What is your name?</p>,
          email: () => <p className="m-0">What is your email?</p>,
          confirm: () => <p className="m-0">Please confirm your details.</p>,
          done: () => <p className="m-0">All done!</p>,
        })}
      </div>
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
            <button
              type="button"
              onClick={() => stepper.navigation.prev()}
              disabled={stepper.state.isFirst}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
            >
              Back
            </button>
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
    </div>
  );
}

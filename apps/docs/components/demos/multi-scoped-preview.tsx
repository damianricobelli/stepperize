"use client";

import * as React from "react";
import { defineStepper } from "@stepperize/react";

const GlobalStepper = defineStepper(
  { id: "start", title: "Start" },
  { id: "middle", title: "Middle" },
  { id: "end", title: "End" },
);

const LocalStepper = defineStepper(
  { id: "sub1", title: "Sub-step 1" },
  { id: "sub2", title: "Sub-step 2" },
);

function GlobalStepContent() {
  const stepper = GlobalStepper.useStepper();
  return (
    <div>
      <p className="m-0 text-sm text-gray-600 dark:text-gray-400">
        Global step: <strong>{stepper.state.current.data.title}</strong>
      </p>
      <div className="min-h-10 text-gray-900 dark:text-gray-100">
        {stepper.flow.switch({
          start: () => <p className="m-0">Start content.</p>,
          middle: () => (
            <LocalStepper.Scoped>
              <LocalStepContent />
              <LocalStepNavigation />
            </LocalStepper.Scoped>
          ),
          end: () => <p className="m-0">End content.</p>,
        })}
      </div>
    </div>
  );
}

function LocalStepContent() {
  const stepper = LocalStepper.useStepper();
  return (
    <p className="m-0 rounded bg-gray-100 px-2 py-1 text-sm dark:bg-gray-800">
      Local step: {stepper.state.current.data.title}
    </p>
  );
}

function LocalStepNavigation() {
  const stepper = LocalStepper.useStepper();
  return (
    <div className="mt-2 flex gap-2">
      <button
        type="button"
        onClick={() => stepper.navigation.prev()}
        disabled={stepper.state.isFirst}
        className="rounded border border-gray-300 bg-white px-2 py-1 text-sm leading-tight disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
      >
        Prev sub
      </button>
      <button
        type="button"
        onClick={() => stepper.navigation.next()}
        disabled={stepper.state.isLast}
        className="rounded border border-blue-500 bg-blue-500 px-2 py-1 text-sm leading-tight text-white dark:border-blue-600 dark:text-white"
      >
        Next sub
      </button>
    </div>
  );
}

function GlobalStepNavigation() {
  const stepper = GlobalStepper.useStepper();
  return (
    <div className="mt-4 flex gap-2">
      {!stepper.state.isFirst && (
        <button
          type="button"
          onClick={() => stepper.navigation.prev()}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Back
        </button>
      )}
      {stepper.state.isLast ? (
        <button
          type="button"
          onClick={() => stepper.navigation.reset()}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Reset
        </button>
      ) : (
        <button
          type="button"
          onClick={() => stepper.navigation.next()}
          className="rounded border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm leading-tight text-white dark:border-blue-600 dark:text-white"
        >
          Next
        </button>
      )}
    </div>
  );
}

export function MultiScopedPreview() {
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <GlobalStepper.Scoped>
        <GlobalStepContent />
        <GlobalStepNavigation />
      </GlobalStepper.Scoped>
    </div>
  );
}

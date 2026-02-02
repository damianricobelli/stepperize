"use client";

import * as React from "react";
import { z } from "zod";
import { defineStepper } from "@stepperize/react";

const PersonalSchema = z.object({
  name: z.string().min(1, "Name required"),
  email: z.email("Invalid email"),
});

const AddressSchema = z.object({
  street: z.string().min(1, "Street required"),
  city: z.string().min(1, "City required"),
});

const { Scoped, useStepper } = defineStepper(
  { id: "personal", title: "Personal", schema: PersonalSchema },
  { id: "address", title: "Address", schema: AddressSchema },
  { id: "done", title: "Done" },
);

type Schema = typeof PersonalSchema | typeof AddressSchema;

function parseStepForm(formData: FormData, schema: Schema) {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  return schema.safeParse(raw);
}

function StepForm() {
  const stepper = useStepper();
  const schema =
    "schema" in stepper.state.current.data
      ? (stepper.state.current.data.schema as Schema)
      : null;
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!schema) return;
    const formData = new FormData(e.currentTarget);
    const result = parseStepForm(formData, schema);
    if (result.success && !stepper.state.isLast) {
      setErrors({});
      stepper.navigation.next();
    } else if (!result.success) {
      const err: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0]?.toString();
        if (key) err[key] = issue.message;
      }
      setErrors(err);
    }
  };

  if (stepper.flow.is("done")) {
    return <p className="m-0 text-gray-900 dark:text-gray-100">All done!</p>;
  }

  const fieldClass =
    "w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";
  const errorClass = "m-0 text-xs text-red-600 dark:text-red-400";

  return (
    <form method="post" onSubmit={handleSubmit} className="space-y-2">
      {stepper.flow.switch({
        personal: () => (
          <>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                Name
              </label>
              <input name="name" className={fieldClass} />
              {errors.name && <p className={errorClass}>{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                Email
              </label>
              <input name="email" type="email" className={fieldClass} />
              {errors.email && <p className={errorClass}>{errors.email}</p>}
            </div>
          </>
        ),
        address: () => (
          <>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                Street
              </label>
              <input name="street" className={fieldClass} />
              {errors.street && <p className={errorClass}>{errors.street}</p>}
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                City
              </label>
              <input name="city" className={fieldClass} />
              {errors.city && <p className={errorClass}>{errors.city}</p>}
            </div>
          </>
        ),
        done: () => null,
      })}
      <button
        type="submit"
        className="rounded border border-blue-500 bg-blue-500 px-3 py-1.5 text-sm leading-tight text-white dark:border-blue-600 dark:text-white"
      >
        Next
      </button>
    </form>
  );
}

function StepNavigation() {
  const stepper = useStepper();
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
      {stepper.state.isLast && (
        <button
          type="button"
          onClick={() => stepper.navigation.reset()}
          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm leading-tight dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        >
          Reset
        </button>
      )}
    </div>
  );
}

function StepTitle() {
  const stepper = useStepper();
  return (
    <p className="m-0 mb-2 text-sm text-gray-600 dark:text-gray-400">
      Step: <strong>{stepper.state.current.data.title}</strong>
    </p>
  );
}

export function ConformReactPreview() {
  return (
    <div className="w-full rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
      <Scoped>
        <StepTitle />
        <StepForm />
        <StepNavigation />
      </Scoped>
    </div>
  );
}

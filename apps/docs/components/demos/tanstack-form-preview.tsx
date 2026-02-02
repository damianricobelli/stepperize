"use client";

import { useForm } from "@tanstack/react-form";
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
  { id: "done", title: "Done", schema: z.object({}) },
);

function StepForm() {
  const stepper = useStepper();
  const stepData = stepper.state.current.data;
  const schema = stepData.schema; 

  const form = useForm({
    defaultValues: { name: "", email: "", street: "", city: "" },
  });

  if (stepper.flow.is("done")) {
    return (
      <p className="m-0 text-gray-900 dark:text-gray-100">All done!</p>
    );
  }

  const fieldClass =
    "w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100";
  const errorClass = "m-0 text-xs text-red-600 dark:text-red-400";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="space-y-2"
    >
      {stepper.flow.switch({
        personal: () => (
          <div className="space-y-2">
            <form.Field name="name">
              {(field) => (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-sm text-gray-600 dark:text-gray-400"
                  >
                    Name
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={fieldClass}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length ? (
                    <p className={errorClass}>
                      {field.state.meta.errors
                        .map((err) => (typeof err === "object" && err && "message" in err ? (err as { message: string }).message : String(err)))
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>
            <form.Field name="email">
              {(field) => (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-sm text-gray-600 dark:text-gray-400"
                  >
                    Email
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    type="email"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={fieldClass}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length ? (
                    <p className={errorClass}>
                      {field.state.meta.errors
                        .map((err) => (typeof err === "object" && err && "message" in err ? (err as { message: string }).message : String(err)))
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>
          </div>
        ),
        address: () => (
          <div className="space-y-2">
            <form.Field name="street">
              {(field) => (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-sm text-gray-600 dark:text-gray-400"
                  >
                    Street
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={fieldClass}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length ? (
                    <p className={errorClass}>
                      {field.state.meta.errors
                        .map((err) => (typeof err === "object" && err && "message" in err ? (err as { message: string }).message : String(err)))
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>
            <form.Field name="city">
              {(field) => (
                <div>
                  <label
                    htmlFor={field.name}
                    className="block text-sm text-gray-600 dark:text-gray-400"
                  >
                    City
                  </label>
                  <input
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className={fieldClass}
                  />
                  {field.state.meta.isTouched && field.state.meta.errors?.length ? (
                    <p className={errorClass}>
                      {field.state.meta.errors
                        .map((err) => (typeof err === "object" && err && "message" in err ? (err as { message: string }).message : String(err)))
                        .join(", ")}
                    </p>
                  ) : null}
                </div>
              )}
            </form.Field>
          </div>
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

export function TanstackFormPreview() {
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

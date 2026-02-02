"use client";

import type { Resolver } from "react-hook-form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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

type PersonalValues = z.infer<typeof PersonalSchema>;
type AddressValues = z.infer<typeof AddressSchema>;

function StepForm() {
  const stepper = useStepper();

  const schema = stepper.state.current.data.schema;

  const form = useForm<PersonalValues & AddressValues>({
    mode: "onTouched",
    defaultValues: { name: "", email: "", street: "", city: "" },
    resolver: zodResolver(schema) as unknown as Resolver<PersonalValues & AddressValues>,
  });

  const onValid = () => {
    if (!stepper.state.isLast) stepper.navigation.next();
  };

  if (stepper.flow.is("done")) {
    return (
      <p className="m-0 text-gray-900 dark:text-gray-100">All done!</p>
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onValid)} className="space-y-2">
      {stepper.flow.switch({
        personal: () => (
          <>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                Name
              </label>
              <input
                {...form.register("name")}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              {form.formState.errors.name && (
                <p className="m-0 text-xs text-red-600 dark:text-red-400">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                Email
              </label>
              <input
                {...form.register("email")}
                type="email"
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              {form.formState.errors.email && (
                <p className="m-0 text-xs text-red-600 dark:text-red-400">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
          </>
        ),
        address: () => (
          <>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                Street
              </label>
              <input
                {...form.register("street")}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              {form.formState.errors.street && (
                <p className="m-0 text-xs text-red-600 dark:text-red-400">
                  {form.formState.errors.street.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400">
                City
              </label>
              <input
                {...form.register("city")}
                className="w-full rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              {form.formState.errors.city && (
                <p className="m-0 text-xs text-red-600 dark:text-red-400">
                  {form.formState.errors.city.message}
                </p>
              )}
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

export function ReactHookFormPreview() {
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

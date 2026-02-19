import type { Step, StepperState } from "@stepperize/core";
import React from "react";

/**
 * Value provided to children of `Stepper.Item`. Same shape as `useStepper().state.current`:
 * `data` (step object), `index`, `status` ("active" | "success" | "inactive"), and `metadata` (get/set/reset).
 */
export type StepItemValue<S extends Step = Step> = StepperState<[S]>["current"];

const StepItemContext = React.createContext<StepItemValue | null>(null);

export function StepItemProvider<S extends Step>({
  value,
  children,
}: {
  value: StepItemValue<S>;
  children: React.ReactNode;
}) {
  return React.createElement(StepItemContext.Provider, { value, children });
}

/**
 * Returns the step data, index, status, and metadata for **this `Stepper.Item`** (the one wrapping the caller).
 *
 * Same **type** as `useStepper().state.current`, but not the same value:
 * - **`state.current`** — The **active** step (the one the user is on). One value for the whole stepper.
 * - **`useStepItemContext()`** — **This item's** step. Each Item gets its own step's `data` and that step's
 *   computed `status` (active/success/inactive). So inside `<Item step="payment">` you get payment's data
 *   and payment's status (e.g. "inactive" if the user is still on shipping).
 *
 * Use this hook when you need "this step" (e.g. to show this item's index, style by this item's status)
 * without passing props. For "which step is active" or navigation, use `useStepper().state.current` instead.
 *
 * - **data** — The step object for this item
 * - **index** — Zero-based index of this step
 * - **status** — `"active"` | `"success"` | `"inactive"` for this step
 * - **metadata** — get/set/reset for this step's metadata
 *
 * @throws Error if called outside a `Stepper.Item`
 * @example
 * ```tsx
 * const CustomIndicator = () => {
 *   const item = useStepItemContext();
 *   return <span>{item.index + 1}</span>;
 * };
 * <Stepper.Item step="shipping">
 *   <Stepper.Trigger><Stepper.Indicator><CustomIndicator /></Stepper.Indicator></Stepper.Trigger>
 * </Stepper.Item>
 * ```
 */
export function useStepItemContext<S extends Step = Step>(): StepItemValue<S> {
  const context = React.useContext(StepItemContext);
  if (!context) {
    throw new Error("useStepItemContext must be used within a Stepper.Item.");
  }
  return context as StepItemValue<S>;
}

export { StepItemContext };

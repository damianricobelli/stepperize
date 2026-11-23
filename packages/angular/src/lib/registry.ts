import type { Id, Step } from "@stepperize/core";

/**
 * Register your definitions to have the step ids you write in templates
 * checked by Angular's template type-checker (`strictTemplates`). Empty by
 * default: every id is a `string`, checked when the template runs.
 *
 * @example
 * // checkout.ts
 * export const checkout = defineStepper([...]);
 *
 * declare module "@stepperize/angular" {
 *   interface StepperRegistry {
 *     checkout: typeof checkout;
 *   }
 * }
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmented by applications.
export interface StepperRegistry {}

/** The steps of one registry entry: a definition (anything with `steps`) or a step array. */
type StepsOf<T> = T extends { readonly steps: infer S extends readonly Step[] }
	? S
	: T extends readonly Step[]
		? T
		: never;

/** Every step of every registered definition, or `Step` when nothing is registered. */
export type RegisteredStep = [keyof StepperRegistry] extends [never]
	? Step
	: { [K in keyof StepperRegistry]: StepsOf<StepperRegistry[K]>[number] }[keyof StepperRegistry];

/**
 * What the step id inputs of the directives accept: the ids of every
 * registered definition, or any `string` when nothing is registered.
 */
export type StepId = [keyof StepperRegistry] extends [never]
	? string
	: { [K in keyof StepperRegistry]: Id<StepsOf<StepperRegistry[K]>> }[keyof StepperRegistry];

/** The step an id or a step object stands for: the registered step with that id, or `Step`. */
export type StepFor<I> = I extends Step
	? I
	: [Extract<RegisteredStep, { id: I }>] extends [never]
		? Step
		: Extract<RegisteredStep, { id: I }>;

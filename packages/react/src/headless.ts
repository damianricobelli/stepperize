export type {
	BeforeStepChange,
	FlowData,
	Get,
	GoToOptions,
	InputOf,
	NavigationFailureReason,
	NavigationPayload,
	NavigationResult,
	OutputOf,
	ResetOptions,
	StandardSchemaV1,
	Step,
	StepChangeContext,
	StepChangeValidator,
	StepDirection,
	StepMatcher,
	Stepper,
	StepperData,
	StepStatus,
	ValidationResult,
} from "@stepperize/core";

export type {
	ControlledStep,
	DefineStepperOptions,
	HeadlessStepperDefinition as StepperDefinition,
	ProviderProps,
	UseStepperOptions,
} from "./types";

import type { Step } from "@stepperize/core";
import { createDefinition, type UniqueStepIds } from "./definition";
import type { DefineStepperOptions, HeadlessStepperDefinition } from "./types";

/** The same state API without UI primitives; use with your own markup or React Native. */
export function defineStepper<const Steps extends readonly Step[]>(
	steps: UniqueStepIds<Steps>,
	options: DefineStepperOptions<Steps> = {},
): HeadlessStepperDefinition<Steps> {
	return createDefinition<Steps>(steps, options).definition;
}

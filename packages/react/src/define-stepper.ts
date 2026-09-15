import type { Step } from "@stepperize/core";
import { createDefinition, type UniqueStepIds } from "./definition";
import { createStepperScope } from "./primitives/context";
import { createStepperPrimitives } from "./primitives/create-stepper-primitives";
import type { DefineStepperOptions, StepperDefinition } from "./types";

/** Define a typed flow with hooks, a Provider and accessible UI primitives. */
export function defineStepper<const Steps extends readonly Step[]>(
	steps: UniqueStepIds<Steps>,
	options: DefineStepperOptions<Steps> = {},
): StepperDefinition<Steps> {
	const { definition, map, scope } = createDefinition<Steps>(steps, options);
	return {
		...definition,
		Stepper: createStepperPrimitives(map, definition.Provider, createStepperScope(scope)),
	};
}

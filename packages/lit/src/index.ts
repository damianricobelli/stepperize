import type { Options, Step } from "@stepperize/core";
import { createDefinition, type Definition } from "./definition";
import { StepperPrimitives } from "./parts";

export type * from "@stepperize/core";
export type { ItemValue, Orientation } from "@stepperize/core/primitives";
export type { ControllerOptions, MaybeGetter } from "./controller";
export { StepperController } from "./controller";
export type { Definition } from "./definition";
export type { PartResult } from "./parts";
export { StepperPrimitives } from "./parts";

/** Define a typed flow: a reactive controller and accessible, unstyled primitives as element directives. */
export function defineStepper<const S extends readonly Step[]>(
	steps: S,
	options: Options<S> = {},
): Definition<S, StepperPrimitives<S>> {
	return createDefinition(steps, options, (host, source) => new StepperPrimitives(host, steps, options, source));
}

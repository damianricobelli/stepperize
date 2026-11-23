import type { Options, Step } from "@stepperize/core";
import { createDefinition, type Definition } from "./definition";
import { StepperPrimitives } from "./parts";

// Named one by one: a bundled `export type *` is published as `export *`, which
// would declare `createStepper` and others that this entry does not have.
export type {
	Code,
	Flow,
	FlowData,
	FlowOutput,
	GuardContext,
	Id,
	Input,
	Issue,
	Options,
	Output,
	Reason,
	Result,
	Snapshot,
	StandardSchemaV1,
	Step,
	StepOf,
	Stepper,
	StepState,
} from "@stepperize/core";
export type { ItemValue, Orientation } from "@stepperize/core/primitives";
export type { ControllerSource, MaybeGetter } from "./controller";
export { StepperController } from "./controller";
export type { Definition } from "./definition";
export type { PartResult, StepItem } from "./parts";
export { StepperPrimitives } from "./parts";

/** Define a typed flow: a reactive controller and accessible, unstyled primitives as element directives. */
export function defineStepper<const S extends readonly Step[]>(
	steps: S,
	options: Options<S> = {},
): Definition<S, StepperPrimitives<S>> {
	return createDefinition(steps, options, (host, source) => new StepperPrimitives(host, steps, options, source));
}

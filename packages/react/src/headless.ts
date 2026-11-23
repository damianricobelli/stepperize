import type { Options, Step } from "@stepperize/core";
import { createDefinition, type Definition } from "./definition";

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
export type { Definition, ProviderProps } from "./definition";

/** The flow and its hooks, without the UI primitives: for your own markup or React Native. */
export function defineStepper<const S extends readonly Step[]>(steps: S, options?: Options<S>): Definition<S> {
	return createDefinition(steps, options).definition;
}

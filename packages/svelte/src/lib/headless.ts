import type { Options, Step } from "@stepperize/core";
import { createDefinition, type Definition } from "./definition.js";

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
export type { Definition } from "./definition.js";
export type { MaybeGetter, ProviderProps } from "./types.js";

/** The flow and its functions, without the UI primitives: for your own markup. */
export function defineStepper<const S extends readonly Step[]>(steps: S, options?: Options<S>): Definition<S> {
	return createDefinition(steps, options).definition;
}

import type {
	BeforeStepChange,
	FlowData,
	Get,
	OutputOf,
	Step,
	StepChangeContext,
	Stepper,
	ValidationResult,
} from "@stepperize/core";
import type React from "react";
import type { StepperPrimitives } from "./primitives/create-stepper-primitives";

export type ControlledStep<Steps extends readonly Step[]> = Get.Id<Steps> | (string & {}) | null;

export type DefineStepperOptions<Steps extends readonly Step[]> = {
	defaultStep?: Get.Id<Steps>;
	defaultData?: FlowData<Steps>;
	defaultCompleted?: Get.Id<Steps>[];
	/**
	 * When `true`, `canGoTo`, trigger primitives, and primitive keyboard
	 * navigation only allow previous steps, the current step, or the immediate
	 * next step. `goTo` follows the same policy unless bypassPolicy is explicit. Defaults to `false`
	 * (free navigation).
	 */
	linear?: boolean;
};

export type UseStepperOptions<Steps extends readonly Step[]> = {
	defaultCompleted?: Get.Id<Steps>[];
	defaultStep?: Get.Id<Steps>;
	/**
	 * Controlled current step id. Accepts raw external string values so URL and
	 * router state can flow in directly; invalid values recover through
	 * `onInvalidStep`.
	 *
	 * Pair with `onStepChange` when syncing the stepper to a router, URL param,
	 * external store, or server state.
	 */
	step?: ControlledStep<Steps>;
	onStepChange?: (step: Get.Id<Steps>, context: StepChangeContext<Steps>) => void;
	/**
	 * Called when a controlled `step` is not a known step id.
	 *
	 * Stepperize falls back to `defaultStep` (or the first step) and passes the
	 * raw value here so you can recover, for example by replacing a URL param.
	 */
	onInvalidStep?: (raw: unknown) => void;
	/**
	 * Step-change guard. Runs before a step change on imperative navigation
	 * only. Return `false` to cancel. Does not run for external controlled
	 * `step` changes.
	 */
	beforeStepChange?: BeforeStepChange<Steps>;
	defaultData?: FlowData<Steps>;
	/**
	 * Controlled flow data.
	 *
	 * Pair with `onDataChange` when the flow data lives outside Stepperize
	 * (server, store, persisted snapshot).
	 */
	data?: FlowData<Steps>;
	onDataChange?: (data: FlowData<Steps>) => void;
	completed?: Get.Id<Steps>[];
	onCompletedChange?: (completed: Get.Id<Steps>[]) => void;
	linear?: boolean;
};

export type ProviderProps<Steps extends readonly Step[]> = React.PropsWithChildren<UseStepperOptions<Steps>>;

/**
 * Object returned by `defineStepper`.
 *
 * It owns the typed step list, hooks, Provider, and pure step access
 * helpers for a single flow.
 */
export type HeadlessStepperDefinition<Steps extends readonly Step[]> = {
	steps: Steps;
	/** Always create an independent local instance, even inside a Provider. */
	useStepper: (options?: UseStepperOptions<Steps>) => Stepper<Steps>;
	/** Consume this definition's nearest Provider; optionally subscribe to a selected value. */
	useStepperContext: {
		(): Stepper<Steps>;
		<Selected>(
			selector: (stepper: Stepper<Steps>) => Selected,
			isEqual?: (previous: Selected, next: Selected) => boolean,
		): Selected;
	};
	Provider: (props: ProviderProps<Steps>) => React.ReactElement;
	get: <Id extends Get.Id<Steps>>(id: Id) => Get.StepById<Steps, Id> | undefined;
	at: <Index extends number>(index: Index) => Steps[Index] | undefined;
	/**
	 * Narrow an arbitrary value (URL param, router state, persisted snapshot) to
	 * a known step id, or `undefined` when it does not match a step.
	 */
	parseStep: (value: unknown) => Get.Id<Steps> | undefined;
	/**
	 * Validate an arbitrary value against a step's schema. Steps without a schema
	 * always succeed with the value unchanged.
	 */
	validate: <Id extends Get.Id<Steps>>(id: Id, value: unknown) => Promise<ValidationResult<OutputOf<Steps, Id>>>;
};

/** Full definition adds the optional UI layer to the same state API. */
export type StepperDefinition<Steps extends readonly Step[]> = HeadlessStepperDefinition<Steps> & {
	Stepper: StepperPrimitives<Steps>;
};

/**
 * A step definition. Only `id` is required; every other property is user data
 * and stays fully typed throughout Stepperize.
 *
 * Add a `schema` (any [Standard Schema](https://standardschema.dev)) to type
 * the step's flow data and enable `validate()`.
 */
type Step<Id extends string = string, Data extends object = object> = {
	id: Id;
} & Data;

/**
 * Minimal vendored copy of the [Standard Schema](https://standardschema.dev) v1
 * interface, used to type flow data and drive `validate()` across Zod, Valibot,
 * ArkType, and any other compliant library — with no runtime dependency.
 */
interface StandardSchemaV1<Input = unknown, Output = Input> {
	readonly "~standard": StandardSchemaV1.Props<Input, Output>;
}

namespace StandardSchemaV1 {
	export interface Props<Input = unknown, Output = Input> {
		readonly version: 1;
		readonly vendor: string;
		readonly validate: (value: unknown) => Result<Output> | Promise<Result<Output>>;
		readonly types?: Types<Input, Output> | undefined;
	}
	export type Result<Output> = SuccessResult<Output> | FailureResult;
	export interface SuccessResult<Output> {
		readonly value: Output;
		readonly issues?: undefined;
	}
	export interface FailureResult {
		readonly issues: ReadonlyArray<Issue>;
	}
	export interface Issue {
		readonly message: string;
		readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined;
	}
	export interface PathSegment {
		readonly key: PropertyKey;
	}
	export interface Types<Input = unknown, Output = Input> {
		readonly input: Input;
		readonly output: Output;
	}
	export type InferInput<Schema extends StandardSchemaV1> = NonNullable<Schema["~standard"]["types"]>["input"];
	export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<Schema["~standard"]["types"]>["output"];
}

type SchemaOf<Steps extends readonly Step[], Id extends Get.Id<Steps>> = Get.StepById<Steps, Id> extends {
	schema: infer S;
}
	? S extends StandardSchemaV1
		? S
		: never
	: never;

/** Input (draft) type for a step's flow data, or `unknown` when the step has no schema. */
type InputOf<Steps extends readonly Step[], Id extends Get.Id<Steps>> = [SchemaOf<Steps, Id>] extends [never]
	? unknown
	: StandardSchemaV1.InferInput<SchemaOf<Steps, Id>>;

/** Output (validated) type for a step's flow data, or `unknown` when the step has no schema. */
type OutputOf<Steps extends readonly Step[], Id extends Get.Id<Steps>> = [SchemaOf<Steps, Id>] extends [never]
	? unknown
	: StandardSchemaV1.InferOutput<SchemaOf<Steps, Id>>;

/**
 * Positional UI status derived from the active index.
 *
 * Explicit completion is separate: use `stepper.setComplete()` and
 * `stepper.isComplete()` for business completion.
 */
type StepStatus = "active" | "previous" | "upcoming";

type StepDirection = "next" | "prev" | "goto" | "reset";

type MaybePromise<T> = T | Promise<T>;

/**
 * Committed cross-step data, not live field state. Use it for review
 * screens, summaries, branching decisions, and resumable wizards. With a per-step
 * `schema`, each entry is typed as that schema's input.
 */
type FlowData<Steps extends readonly Step[] = readonly Step[]> = {
	[Id in Get.Id<Steps>]?: InputOf<Steps, Id>;
};

type StepChangeValidator<
	Steps extends readonly Step[] = readonly Step[],
	FromId extends Get.Id<Steps> = Get.Id<Steps>,
> = {
	/**
	 * Validate the step being left against this transition's data snapshot.
	 *
	 * Inside `beforeStepChange`, this includes any pending navigation payload
	 * before it has been committed to `stepper.data`.
	 */
	(): Promise<ValidationResult<OutputOf<Steps, FromId>>>;
	<Id extends Get.Id<Steps>>(id: Id): Promise<ValidationResult<OutputOf<Steps, Id>>>;
	<Id extends Get.Id<Steps>>(step: Get.StepById<Steps, Id>): Promise<ValidationResult<OutputOf<Steps, Id>>>;
};

type StepChangeContextBase<Steps extends readonly Step[], FromId extends Get.Id<Steps>> = {
	from: Get.StepById<Steps, FromId>;
	to: Steps[number];
	fromIndex: number;
	toIndex: number;
	direction: StepDirection;
	data: FlowData<Steps>;
	validate: StepChangeValidator<Steps, FromId>;
	statuses: Record<Get.Id<Steps>, StepStatus>;
};

/**
 * Context passed to the step-change guard and to `onStepChange`.
 *
 * `data` includes any payload passed to `next`, `prev`, `goTo`, or `reset`
 * before callbacks run, so validation does not need to wait for React state.
 *
 * Use `ctx.validate()` in guards to validate the step being left against that
 * transition data snapshot.
 */
type StepChangeContext<Steps extends readonly Step[] = readonly Step[]> = {
	[FromId in Get.Id<Steps>]: StepChangeContextBase<Steps, FromId>;
}[Get.Id<Steps>];

/**
 * The step-change guard. Runs before a step change on imperative navigation
 * (`next`, `prev`, `goTo`, `reset`). Return `false` to cancel the change.
 *
 * Does not run for external controlled `step` changes; those are authoritative.
 */
type BeforeStepChange<Steps extends readonly Step[] = readonly Step[]> = (
	context: StepChangeContext<Steps>,
) => MaybePromise<boolean | undefined>;

/**
 * Optional data passed while navigating.
 *
 * `data` is staged for the current step before the guard runs, and persisted
 * only if the change is accepted.
 */
type NavigationPayload = {
	data?: unknown;
};

/**
 * Navigation methods resolve to `false` when the stepper is already at an edge
 * or a guard cancelled the change.
 */
type NavigationResult = boolean;

type ValidationResult<T = unknown> =
	| { success: true; data: T }
	| { success: false; issues: ReadonlyArray<StandardSchemaV1.Issue> };

type StepperData<Steps extends readonly Step[] = readonly Step[]> = {
	/**
	 * Get flow data for the current step, or for a specific step when an id is
	 * passed. With an id, the result is typed as that step's schema input.
	 *
	 * @example
	 * ```ts
	 * stepper.data.get();             // current step (unknown)
	 * stepper.data.get("shipping");   // ShippingInput | undefined
	 * ```
	 */
	get: {
		(): unknown;
		<Id extends Get.Id<Steps>>(id: Id): InputOf<Steps, Id> | undefined;
	};
	/**
	 * Set flow data for the current step, or for a specific step when an id is
	 * passed. With an id, the value is type-checked against that step's schema input.
	 *
	 * @example
	 * ```ts
	 * stepper.data.set(formValues);
	 * stepper.data.set("payment", paymentValues);
	 * ```
	 */
	set: {
		(value: unknown): void;
		<Id extends Get.Id<Steps>>(id: Id, value: InputOf<Steps, Id>): void;
	};
	all: () => FlowData<Steps>;
	clear: (id?: Get.Id<Steps>) => void;
	reset: () => void;
};

/** Exhaustive matcher for the current step. */
type StepMatcher<Steps extends readonly Step[] = readonly Step[]> = <Result>(
	handlers: Get.Match<Steps, Result>,
) => Result;

type StepMap<Steps extends readonly Step[] = readonly Step[]> = {
	steps: Steps;
	ids: Get.Id<Steps>[];
	get: <Id extends Get.Id<Steps>>(id: Id) => Get.StepById<Steps, Id> | undefined;
	at: <Index extends number>(index: Index) => Steps[Index] | undefined;
	/** Get the index for a step id, or `-1` when missing. */
	indexOf: <Id extends Get.Id<Steps>>(id: Id) => number;
	/** Check whether an arbitrary string is one of the step ids. */
	has: <Id extends string>(id: Id) => boolean;
	first: () => Steps[number] | undefined;
	last: () => Steps[number] | undefined;
	next: <Id extends Get.Id<Steps>>(id: Id) => Steps[number] | undefined;
	prev: <Id extends Get.Id<Steps>>(id: Id) => Steps[number] | undefined;
	neighbors: <Id extends Get.Id<Steps>>(id: Id) => { prev: Steps[number] | undefined; next: Steps[number] | undefined };
};

/**
 * Runtime stepper instance returned by `useStepper`.
 *
 * The instance is intentionally lean: it exposes live state, queries, flow data,
 * validation, rendering, and navigation. Static step lookups live on the
 * definition (`wizard.get`, `wizard.at`) and on the raw `steps` array.
 */
type Stepper<Steps extends readonly Step[] = readonly Step[]> = {
	steps: Steps;
	current: Steps[number];
	id: Get.Id<Steps>;
	index: number;
	count: number;
	progress: number;
	/** Explicitly completed step ids, independent from positional status. */
	completed: Get.Id<Steps>[];
	isFirst: boolean;
	isLast: boolean;
	canPrev: boolean;
	canNext: boolean;
	isPending: boolean;
	data: StepperData<Steps>;
	status: <Id extends Get.Id<Steps>>(id: Id) => StepStatus;
	setComplete: (id?: Get.Id<Steps>, value?: boolean) => void;
	isComplete: (id?: Get.Id<Steps>) => boolean;
	/**
	 * Validate a step's stored flow data against its schema. Defaults to the
	 * current step. Steps without a schema always succeed with the stored value.
	 */
	validate: <Id extends Get.Id<Steps>>(id?: Id) => Promise<ValidationResult<OutputOf<Steps, Id>>>;
	/**
	 * Check whether `goTo(id)` is allowed by the navigation policy and reflected
	 * by trigger primitives. Imperative `goTo` is not gated by this and always
	 * proceeds (subject to the guard), which enables branching flows.
	 */
	canGoTo: <Id extends Get.Id<Steps>>(id: Id) => boolean;
	is: <Id extends Get.Id<Steps>>(id: Id) => boolean;
	match: StepMatcher<Steps>;
	next: (payload?: NavigationPayload) => Promise<NavigationResult>;
	prev: (payload?: NavigationPayload) => Promise<NavigationResult>;
	/** Move to a specific step id. Bypasses the navigation policy. Resolves to whether the step changed. */
	goTo: (id: Get.Id<Steps>, payload?: NavigationPayload) => Promise<NavigationResult>;
	reset: (payload?: NavigationPayload) => Promise<NavigationResult>;
};

namespace Get {
	export type Id<Steps extends readonly Step[] = readonly Step[]> = Steps[number]["id"];

	export type StepById<Steps extends readonly Step[], Id extends Get.Id<Steps>> = Extract<Steps[number], { id: Id }>;

	/** Exhaustive handler map keyed by step id. */
	export type Match<Steps extends readonly Step[], Result> = {
		[Id in Get.Id<Steps>]: (step: Get.StepById<Steps, Id>) => Result;
	};
}

export type {
	BeforeStepChange,
	FlowData,
	Get,
	InputOf,
	MaybePromise,
	NavigationPayload,
	NavigationResult,
	OutputOf,
	StandardSchemaV1,
	Step,
	StepChangeContext,
	StepChangeValidator,
	StepDirection,
	StepMap,
	StepMatcher,
	Stepper,
	StepperData,
	StepStatus,
	ValidationResult,
};

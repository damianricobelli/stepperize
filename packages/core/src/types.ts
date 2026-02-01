type Step<Id extends string = string, Data extends object = {}> = {
	id: Id;
} & Data;
type Metadata = Record<string, any> | null;

/** Step status for UI: active (current), success (past), inactive (future) */
type StepStatus = "active" | "inactive" | "success";

type StepperState<Steps extends Step[] = Step[]> = {
	/**
	 * The steps of the stepper.
	 * @returns The steps of the stepper.
	 */
	all: Steps;
	/**
	 * The current step of the stepper.
	 * @returns The current step of the stepper.
	 */
	current: {
		data: Steps[number];
		index: number;
		status: StepStatus;
		metadata: {
			get: <M extends Metadata>() => M;
			set: <M extends Metadata>(values: M) => void;
			reset: (keepInitialMetadata?: boolean) => void;
		}
	}
	/**
	 * Returns true if the current step is the last step.
	 * @returns True if the current step is the last step.
	 */
	isLast: boolean;
	/**
	 * Returns true if the current step is the first step.
	 * @returns True if the current step is the first step.
	 */
	isFirst: boolean;
	/**
	 * Returns true if the stepper is transitioning.
	 * @returns True if the stepper is transitioning.
	 */
	isTransitioning: boolean;
};

type StepperNavigation<Steps extends Step[] = Step[]> = {
	/**
	 * Advances to the next step.
	 * @returns The next step.
	 */
	next: () => void | Promise<void>;
	/**
	 * Returns to the previous step.
	 * @returns The previous step.
	 */
	prev: () => void | Promise<void>;
	/**
	 * Navigates to a specific step by its ID.
	 * @param id - The ID of the step to navigate to.
	 * @returns The step to navigate to.
	 */
	goTo: (id: Get.Id<Steps>) => void | Promise<void>;
	/**
	 * Resets the stepper to its initial state.
	 * @returns The initial state of the stepper.
	 */
	reset: () => void;
};

type StepperQuery<Steps extends Step[] = Step[]> = {
	/**
	 * Retrieves all steps.
	 * @returns An array of all steps.
	 */
	getAll: () => Steps;
	/**
	 * Retrieves a step by its ID.
	 * @param id - The ID of the step to retrieve.
	 * @returns The step with the specified ID.
	 */
	get: <Id extends Get.Id<Steps>>(id: Id) => Get.StepById<Steps, Id>;
	/**
	 * Retrieves the index of a step by its ID.
	 * @param id - The ID of the step to retrieve the index for.
	 * @returns The index of the step.
	 */
	getIndex: <Id extends Get.Id<Steps>>(id: Id) => number;
	/**
	 * Retrieves a step by its index.
	 * @param index - The index of the step to retrieve.
	 * @returns The step at the specified index.
	 */
	getByIndex: <Index extends number>(index: Index) => Steps[Index];
	/**
	 * Retrieves the first step.
	 * @returns The first step.
	 */
	getFirst: () => Steps[number];
	/**
	 * Retrieves the last step.
	 * @returns The last step.
	 */
	getLast: () => Steps[number];
	/**
	 * Retrieves the next step after the specified ID.
	 * @param id - The ID of the current step.
	 * @returns The next step.
	 */
	getNext: <Id extends Get.Id<Steps>>(id: Id) => Steps[number];
	/**
	 * Retrieves the previous step before the specified ID.
	 * @param id - The ID of the current step.
	 * @returns The previous step.
	 */
	getPrev: <Id extends Get.Id<Steps>>(id: Id) => Steps[number];
	/**
	 * Retrieves the neighboring steps (previous and next) of the specified step.
	 * @param id - The ID of the current step.
	 * @returns An object containing the previous and next steps.
	 */
	getNeighbors: <Id extends Get.Id<Steps>>(id: Id) => { prev: Steps[number] | null; next: Steps[number] | null };
};

type StepperFlow<Steps extends Step[] = Step[]> = {
	/**
	 * Executes a function based on the current step ID.
	 * @param id - The ID of the step to check.
	 * @param whenFn - Function to execute if the current step matches the ID.
	 * @param elseFn - Optional function to execute if the current step does not match the ID.
	 * @returns The result of whenFn or elseFn.
	 */
	when: <Id extends Get.Id<Steps>, R1, R2>(
		id: Id | [Id, ...boolean[]],
		whenFn: (step: Get.StepById<Steps, Id>) => R1,
		elseFn?: (step: Get.StepSansId<Steps, Id>) => R2,
	) => R1 | R2;
	/**
	 * Executes a function based on a switch-case-like structure for steps.
	 * @param when - An object mapping step IDs to functions.
	 * @returns The result of the function corresponding to the current step ID.
	 */
	switch: <R>(when: Get.Switch<Steps, R>) => R;
	/**
	 * Matches the current state with a set of possible states and executes the corresponding function.
	 * @param state - The current state ID.
	 * @param matches - An object mapping state IDs to functions.
	 * @returns The result of the matched function or null if no match is found.
	 */
	match: <State extends Get.Id<Steps>, R>(state: State, matches: Get.Switch<Steps, R>) => R | null;
};

type StepperMetadata<Steps extends Step[] = Step[]> = {
	/**
	 * The metadata values for each step.
	 * @returns The metadata values for each step.
	 */
	values: Record<Get.Id<Steps>, Metadata>;
	/**
	 * Sets the metadata values for a step.
	 * @param id - The ID of the step to set the metadata values for.
	 * @param values - The values to set for the metadata.
	 */
	set: <M extends Metadata>(id: Get.Id<Steps>, values: M) => void;
	/**
	 * Gets the metadata values for a step.
	 * @param id - The ID of the step to get the metadata values for.
	 * @returns The metadata values for the step.
	 */
	get: <M extends Metadata>(id: Get.Id<Steps>) => M;
	/**
	 * Resets the metadata values to the initial state.
	 * @param keepInitialMetadata - If true, the initial metadata values defined in the useStepper hook will be kept.
	 */
	reset: (keepInitialMetadata?: boolean) => void;
};

type Stepper<Steps extends Step[] = Step[]> = {
	state: StepperState<Steps>;
	navigation: StepperNavigation<Steps>;
	query: StepperQuery<Steps>;
	flow: StepperFlow<Steps>;
	metadata: StepperMetadata<Steps>;
};

namespace Get {
	/** Returns a union of possible IDs from the given Steps. */
	export type Id<Steps extends Step[] = Step[]> = Steps[number]["id"];

	/** Returns a Step from the given Steps with the given Step Id. */
	export type StepById<Steps extends Step[], Id extends Get.Id<Steps>> = Extract<Steps[number], { id: Id }>;

	/** Returns any Steps from the given Steps without the given Step Id. */
	export type StepSansId<Steps extends Step[], Id extends Get.Id<Steps>> = Exclude<Steps[number], { id: Id }>;

	/** Returns any Steps from the given Steps without the given Step Id. */
	export type Switch<Steps extends Step[], R> = {
		[Id in Get.Id<Steps>]?: (step: Get.StepById<Steps, Id>) => R;
	};
}

export type {
	Step,
	Metadata,
	StepStatus,
	StepperState,
	StepperNavigation,
	StepperQuery,
	StepperFlow,
	StepperMetadata,
	Stepper,
	Get,
}
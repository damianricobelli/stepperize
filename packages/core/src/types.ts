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

type StepperLookup<Steps extends Step[] = Step[]> = {
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
	/**
	 * Returns whether the current step has the given ID. Use for conditionals (e.g. `stepper.flow.is("payment")`).
	 *
	 * @param id - Step ID to check (e.g. `"shipping"`, `"payment"`).
	 * @returns `true` if the current step's id equals `id`, otherwise `false`.
	 *
	 * @example
	 * ```ts
	 * if (stepper.flow.is("payment")) {
	 *   return <PaymentForm />;
	 * }
	 * // or in JSX
	 * {stepper.flow.is("confirmation") && <Summary />}
	 * ```
	 */
	is: <Id extends Get.Id<Steps>>(id: Id) => boolean;
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

type StepperLifecycle<Steps extends Step[] = Step[]> = {
	/**
	 * Called before a transition occurs.
	 * @param cb - The callback to call before the transition occurs.
	 */
	onBeforeTransition: (cb: (ctx: TransitionContext<Steps>) => void | Promise<void | false>) => void;
	/**
	 * Called after a transition occurs.
	 */
	onAfterTransition: (cb: (ctx: TransitionContext<Steps>) => void | Promise<void>) => void;
};

type TransitionContext<Steps extends Step[] = Step[]> = {
	/**
	 * The step being transitioned from.
	 */
	from: Steps[number];
	/**
	 * The step being transitioned to.
	 */
	to: Steps[number];
	/**
	 * The metadata for the transition.
	 */
	metadata: Record<Get.Id<Steps>, Metadata>;
	/**
	 * The statuses for the transition.
	 */
	statuses: Record<Get.Id<Steps>, StepStatus>;
	/**
	 * The direction of the transition.
	 */
	direction: "next" | "prev" | "goTo";
	/**
	 * The index of the step being transitioned from.
	 */
	fromIndex: number;
	/**
	 * The index of the step being transitioned to.
	 */
	toIndex: number;
};

/**
 * Full stepper API returned by `useStepper` / `defineStepper`. Gives you state, navigation, lookup helpers, flow branching, and step-scoped metadata.
 *
 * @example
 * ```ts
 * const stepper = useStepper({ steps: [{ id: "a" }, { id: "b" }] });
 * stepper.state.current.data;   // current step
 * stepper.navigation.next();    // go next
 * stepper.lookup.get("b");      // get step by id
 * stepper.flow.when("a", () => "on A", () => "else");  // branch by step
 * stepper.metadata.set("a", { count: 1 });            // step metadata
 * ```
 */
type Stepper<Steps extends Step[] = Step[]> = {
	/**
	 * Read-only state: current step data, index, status (active/inactive/success), and metadata get/set for the active step.
	 * @example `stepper.state.current.data` — current step; `stepper.state.current.metadata.get()` — current step metadata
	 */
	state: StepperState<Steps>;
	/**
	 * Imperative navigation: `next()`, `prev()`, `goTo(id)`, `reset()`.
	 * @example `stepper.navigation.next()` — advance; `stepper.navigation.goTo("confirm")` — jump to step by id
	 */
	navigation: StepperNavigation<Steps>;
	/**
	 * Step lookup: `getAll()`, `get(id)`, `getIndex(id)`, `getByIndex(i)`, `getFirst` / `getLast` / `getNext` / `getPrev` / `getNeighbors(id)`.
	 * @example `stepper.lookup.get("summary")` — get step by id; `stepper.lookup.getNext(stepper.state.current.data.id)` — next step
	 */
	lookup: StepperLookup<Steps>;
	/**
	 * Branch by step id: `when(id, whenFn, elseFn?)`, `switch(when)`, `match(state, matches)`.
	 * @example `stepper.flow.when("payment", () => <Payment />)` — render by step; `stepper.flow.switch({ payment: () => 1, done: () => 2 })` — switch by id
	 */
	flow: StepperFlow<Steps>;
	/**
	 * Step-scoped metadata: `values`, `set(id, values)`, `get(id)`, `reset()`.
	 * @example `stepper.metadata.set("form", { draft: true })` — persist data per step; `stepper.metadata.get("form")` — read it
	 */
	metadata: StepperMetadata<Steps>;
	/**
	 * Lifecycle hooks: `onBeforeTransition()`, `onAfterTransition()`.
	 * @example `stepper.lifecycle.onBeforeTransition(() => { console.log("before transition") });` — before transition; `stepper.lifecycle.onAfterTransition(() => { console.log("after transition") });` — after transition
	 */
	lifecycle: StepperLifecycle<Steps>;
}

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

/** Alias for StepperLookup (return type of generateStepperUtils). */
export type Utils<Steps extends Step[] = Step[]> = StepperLookup<Steps>;

export type {
	Step,
	Metadata,
	StepStatus,
	StepperState,
	StepperNavigation,
	StepperLookup,
	StepperFlow,
	StepperMetadata,
	Stepper,
	Get,
}
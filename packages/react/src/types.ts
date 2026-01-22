import type {
	Get,
	HistoryEntry,
	PersistConfig,
	RouterConfig,
	Step,
	StepMetadata,
	StepperConfig,
	StepStatus,
	StepStatuses,
	TransitionContext,
	Utils,
} from "@stepperize/core";

// =============================================================================
// SCOPED COMPONENT PROPS
// =============================================================================

/**
 * Props for the Scoped provider component.
 */
export type ScopedProps<Steps extends Step[]> = React.PropsWithChildren<{
	/** The initial step to display. */
	initialStep?: Get.Id<Steps>;
	/** Initial metadata values for steps. */
	initialMetadata?: Partial<StepMetadata<Steps>>;
	/** Initial status values for steps. */
	initialStatuses?: Partial<StepStatuses<Steps>>;
}>;

// =============================================================================
// STEPPER INSTANCE (HOOK RETURN)
// =============================================================================

/**
 * The stepper instance returned by useStepper hook.
 * Contains all state and methods for controlling the stepper.
 */
export type StepperInstance<Steps extends Step[]> = {
	// -------------------------------------------------------------------------
	// State
	// -------------------------------------------------------------------------

	/** All defined steps. */
	readonly all: Steps;
	/** The current active step. */
	readonly current: Steps[number];
	/** Index of the current step. */
	readonly currentIndex: number;
	/** `true` if the current step is the last step. */
	readonly isLast: boolean;
	/** `true` if the current step is the first step. */
	readonly isFirst: boolean;
	/** Metadata for all steps. */
	readonly metadata: StepMetadata<Steps>;
	/** Status of all steps. */
	readonly statuses: StepStatuses<Steps>;
	/** Progress percentage (0-100) based on completed steps. */
	readonly progress: number;
	/** Array of completed steps (status === "success"). */
	readonly completedSteps: Steps[number][];

	// -------------------------------------------------------------------------
	// Navigation
	// -------------------------------------------------------------------------

	/**
	 * Navigate to the next step.
	 * @throws Error if already on the last step.
	 */
	next: () => void;
	/**
	 * Navigate to the previous step.
	 * @throws Error if already on the first step.
	 */
	prev: () => void;
	/**
	 * Navigate to a specific step by ID.
	 * @param id - The step ID to navigate to.
	 * @throws Error if step ID is not found.
	 */
	goTo: (id: Get.Id<Steps>) => void;
	/**
	 * Reset the stepper to its initial state.
	 * @param options - Reset options.
	 */
	reset: (options?: { keepMetadata?: boolean; keepStatuses?: boolean }) => void;

	// -------------------------------------------------------------------------
	// Step Retrieval
	// -------------------------------------------------------------------------

	/**
	 * Get a step by its ID with full type inference.
	 * @param id - The step ID.
	 * @returns The step object.
	 */
	get: <Id extends Get.Id<Steps>>(id: Id) => Get.StepById<Steps, Id>;

	// -------------------------------------------------------------------------
	// Status Management
	// -------------------------------------------------------------------------

	/**
	 * Get the status of a specific step.
	 * @param id - The step ID.
	 * @returns The step's current status.
	 */
	getStatus: (id: Get.Id<Steps>) => StepStatus;
	/**
	 * Set the status of a specific step.
	 * @param id - The step ID.
	 * @param status - The new status.
	 */
	setStatus: (id: Get.Id<Steps>, status: StepStatus) => void;
	/**
	 * Check if a step is completed (status is "success").
	 * @param id - The step ID.
	 * @returns `true` if the step is completed.
	 */
	isCompleted: (id: Get.Id<Steps>) => boolean;
	/**
	 * Check if a step can be accessed (dependencies satisfied).
	 * @param id - The step ID.
	 * @returns `true` if the step can be accessed.
	 */
	canAccess: (id: Get.Id<Steps>) => boolean;

	// -------------------------------------------------------------------------
	// Metadata Management
	// -------------------------------------------------------------------------

	/**
	 * Set metadata for a specific step with type safety.
	 * @param id - The step ID.
	 * @param values - The metadata values to set.
	 */
	setMetadata: <Id extends Get.Id<Steps>>(
		id: Id,
		values: StepMetadata<Steps>[Id],
	) => void;
	/**
	 * Get metadata for a specific step with type inference.
	 * @param id - The step ID.
	 * @returns The step's metadata.
	 */
	getMetadata: <Id extends Get.Id<Steps>>(id: Id) => StepMetadata<Steps>[Id];
	/**
	 * Reset all metadata to initial values.
	 * @param keepInitialMetadata - If `true`, keeps the initial metadata from config.
	 */
	resetMetadata: (keepInitialMetadata?: boolean) => void;

	// -------------------------------------------------------------------------
	// Transition Callbacks
	// -------------------------------------------------------------------------

	/**
	 * Execute a callback before navigating to the next step.
	 * If callback returns `false`, navigation is cancelled.
	 */
	beforeNext: (callback: () => Promise<boolean> | boolean) => Promise<void>;
	/**
	 * Execute a callback after navigating to the next step.
	 */
	afterNext: (callback: () => Promise<void> | void) => Promise<void>;
	/**
	 * Execute a callback before navigating to the previous step.
	 * If callback returns `false`, navigation is cancelled.
	 */
	beforePrev: (callback: () => Promise<boolean> | boolean) => Promise<void>;
	/**
	 * Execute a callback after navigating to the previous step.
	 */
	afterPrev: (callback: () => Promise<void> | void) => Promise<void>;
	/**
	 * Execute a callback before navigating to a specific step.
	 * If callback returns `false`, navigation is cancelled.
	 */
	beforeGoTo: (id: Get.Id<Steps>, callback: () => Promise<boolean> | boolean) => Promise<void>;
	/**
	 * Execute a callback after navigating to a specific step.
	 */
	afterGoTo: (id: Get.Id<Steps>, callback: () => Promise<void> | void) => Promise<void>;

	// -------------------------------------------------------------------------
	// Conditional Rendering
	// -------------------------------------------------------------------------

	/**
	 * Conditionally execute a function based on the current step.
	 * @param id - The step ID to match (or array with additional conditions).
	 * @param whenFn - Function to execute if current step matches.
	 * @param elseFn - Optional function to execute if current step doesn't match.
	 * @returns Result of whenFn or elseFn.
	 */
	when: <Id extends Get.Id<Steps>, R1, R2 = undefined>(
		id: Id | [Id, ...boolean[]],
		whenFn: (step: Get.StepById<Steps, Id>) => R1,
		elseFn?: (step: Get.StepSansId<Steps, Id>) => R2,
	) => R1 | R2;
	/**
	 * Switch-case style rendering based on current step.
	 * @param cases - Object mapping step IDs to render functions.
	 * @returns Result of the matched case function.
	 */
	switch: <R>(cases: Get.Switch<Steps, R>) => R | undefined;
	/**
	 * Match an external state against step IDs.
	 * @param state - The state to match.
	 * @param matches - Object mapping step IDs to functions.
	 * @returns Result of the matched function or `null`.
	 */
	match: <State extends Get.Id<Steps>, R>(
		state: State,
		matches: Get.Switch<Steps, R>,
	) => R | null;

	// -------------------------------------------------------------------------
	// History (Undo/Redo)
	// -------------------------------------------------------------------------

	/** `true` if there's a previous state to undo to. */
	readonly canUndo: boolean;
	/** `true` if there's a next state to redo to. */
	readonly canRedo: boolean;
	/** Navigate to the previous state in history. */
	undo: () => void;
	/** Navigate to the next state in history. */
	redo: () => void;
	/** The navigation history stack. */
	readonly history: HistoryEntry<Steps>[];
};

// =============================================================================
// DEFINE STEPPER RETURN TYPES
// =============================================================================

/**
 * Hook props for useStepper.
 */
export type UseStepperProps<Steps extends Step[]> = {
	/** The initial step to display. */
	initialStep?: Get.Id<Steps>;
	/** Initial metadata values for steps. */
	initialMetadata?: Partial<StepMetadata<Steps>>;
	/** Initial status values for steps. */
	initialStatuses?: Partial<StepStatuses<Steps>>;
};

/**
 * The object returned by defineStepper() (before or after .config()).
 */
export type StepperDefinition<Steps extends Step[]> = {
	/** The defined steps. */
	steps: Steps;
	/**
	 * Utility functions for working with steps.
	 * These are pure functions that don't depend on React state.
	 */
	utils: Utils<Steps>;
	/**
	 * Scoped provider component that provides stepper context to children.
	 * Use this when you need multiple components to share the same stepper state.
	 */
	Scoped: (props: ScopedProps<Steps>) => React.ReactElement;
	/**
	 * Hook to access and control the stepper.
	 * Can be used standalone or within a Scoped provider.
	 */
	useStepper: (props?: UseStepperProps<Steps>) => StepperInstance<Steps>;
};

/**
 * Configuration options for the stepper (passed to .config()).
 */
export type StepperConfigOptions<Steps extends Step[]> = {
	/**
	 * The initial step to display.
	 * @default First step in the array
	 */
	initialStep?: Get.Id<Steps>;
	/**
	 * Initial metadata values for steps.
	 */
	initialMetadata?: Partial<StepMetadata<Steps>>;
	/**
	 * Initial status values for steps.
	 * @default All steps start as "idle"
	 */
	initialStatuses?: Partial<StepStatuses<Steps>>;
	/**
	 * Navigation mode.
	 * - `"linear"`: Steps must be completed in order.
	 * - `"free"`: Any step can be accessed at any time.
	 * @default "free"
	 */
	mode?: "linear" | "free";
	/**
	 * Callback executed before any transition.
	 * Return `false` to prevent the transition.
	 */
	onBeforeTransition?: (ctx: TransitionContext<Steps>) => boolean | Promise<boolean>;
	/**
	 * Callback executed after any transition completes.
	 */
	onAfterTransition?: (ctx: TransitionContext<Steps>) => void | Promise<void>;
	/**
	 * Router configuration for URL synchronization.
	 * @see RouterConfig
	 */
	router?: RouterConfig<Steps>;
	/**
	 * Persistence configuration for saving state.
	 * @see PersistConfig
	 */
	persist?: PersistConfig<Steps>;
};

/**
 * Builder object returned by defineStepper() that allows chaining .config().
 */
export type StepperBuilder<Steps extends Step[]> = StepperDefinition<Steps> & {
	/**
	 * Configure the stepper with additional options.
	 * This method returns a new StepperDefinition with the config applied.
	 *
	 * @param options - Configuration options
	 * @returns A configured StepperDefinition
	 *
	 * @example
	 * ```ts
	 * const stepper = defineStepper(
	 *   { id: "step-1", title: "Step 1" },
	 *   { id: "step-2", title: "Step 2" }
	 * ).config({
	 *   initialStep: "step-1",
	 *   mode: "linear",
	 *   onBeforeTransition: (ctx) => {
	 *     console.log(`Navigating from ${ctx.from.id} to ${ctx.to.id}`);
	 *     return true;
	 *   }
	 * });
	 * ```
	 */
	config: (options: StepperConfigOptions<Steps>) => StepperDefinition<Steps>;
};

// =============================================================================
// LEGACY TYPES (for backwards compatibility)
// =============================================================================

/**
 * @deprecated Use StepperDefinition instead
 */
export type StepperReturn<Steps extends Step[]> = StepperDefinition<Steps>;

// =============================================================================
// STANDARD SCHEMA
// =============================================================================

import type { StandardSchemaV1 } from "./standard-schema";

// =============================================================================
// STEP STATUS
// =============================================================================

/**
 * Possible status values for a step.
 * Inspired by TanStack Query's status pattern.
 */
export type StepStatus = "idle" | "pending" | "loading" | "error" | "success" | "skipped";

/**
 * Record of step statuses indexed by step ID.
 */
export type StepStatuses<Steps extends Step[]> = Record<Get.Id<Steps>, StepStatus>;

// =============================================================================
// STEP DEFINITION
// =============================================================================

/**
 * Base step definition. Every step must have a unique `id`.
 * Additional properties can be added for custom data (title, description, icon, etc.).
 */
export type Step<
	Id extends string = string,
	Schema extends StandardSchemaV1 | undefined = undefined,
> = {
	/** Unique identifier for the step. */
	readonly id: Id;
	/** Optional Standard Schema for validating step metadata. */
	readonly schema?: Schema;
	/**
	 * Function to determine if this step should be skipped.
	 * @param metadata - Current metadata state.
	 * @returns `true` to skip the step, `false` otherwise.
	 */
	readonly skip?: (metadata: Record<string, unknown>) => boolean;
	/**
	 * Array of step IDs that must be completed before this step can be accessed.
	 * Used for dependency-based navigation control.
	 */
	readonly requires?: readonly string[];
} & Record<string, unknown>;

/**
 * Infers the metadata type from a step's schema.
 * If no schema is defined, defaults to `Record<string, unknown> | null`.
 * If schema exists but doesn't have types defined, defaults to `unknown`.
 */
export type InferStepMetadata<S extends Step> = S["schema"] extends StandardSchemaV1
	? S["schema"]["~standard"]["types"] extends StandardSchemaV1.Types
		? S["schema"]["~standard"]["types"]["output"]
		: unknown
	: Record<string, unknown> | null;

/**
 * Creates a typed metadata record from an array of steps.
 * Each step ID maps to its inferred metadata type.
 */
export type StepMetadata<Steps extends Step[]> = {
	[K in Steps[number] as K["id"]]: InferStepMetadata<K>;
};

// =============================================================================
// TRANSITION CONTEXT
// =============================================================================

/**
 * Direction of a step transition.
 */
export type TransitionDirection = "next" | "prev" | "goTo";

/**
 * Context object passed to transition callbacks.
 * Contains all information about the transition being performed.
 *
 * @typeParam Steps - The array of step definitions.
 */
export type TransitionContext<Steps extends Step[]> = {
	/** The step being transitioned from. */
	readonly from: Steps[number];
	/** The step being transitioned to. */
	readonly to: Steps[number];
	/** Current metadata state. */
	readonly metadata: StepMetadata<Steps>;
	/** Current status of all steps. */
	readonly statuses: StepStatuses<Steps>;
	/** Direction of the transition. */
	readonly direction: TransitionDirection;
	/** Index of the source step. */
	readonly fromIndex: number;
	/** Index of the target step. */
	readonly toIndex: number;
};

// =============================================================================
// ROUTER ADAPTER
// =============================================================================

/**
 * Interface for router adapters.
 * Allows synchronizing stepper state with URL parameters.
 *
 * @typeParam Steps - The array of step definitions.
 */
export type RouterAdapter<Steps extends Step[] = Step[]> = {
	/**
	 * Subscribe to URL parameter changes.
	 * @param onChange - Callback invoked when the step parameter changes.
	 * @returns Cleanup function to unsubscribe.
	 */
	subscribe: (onChange: (stepId: Get.Id<Steps> | null) => void) => () => void;
	/**
	 * Push a new step ID to the URL (adds to history).
	 * @param stepId - The step ID to navigate to.
	 */
	push: (stepId: Get.Id<Steps>) => void;
	/**
	 * Replace the current step ID in the URL (no history entry).
	 * @param stepId - The step ID to navigate to.
	 */
	replace: (stepId: Get.Id<Steps>) => void;
	/**
	 * Get the current step ID from the URL.
	 * @returns The current step ID or `null` if not present.
	 */
	getParam: () => Get.Id<Steps> | null;
};

/**
 * Configuration for router integration.
 */
export type RouterConfig<Steps extends Step[]> = {
	/** The router adapter instance. */
	adapter: RouterAdapter<Steps>;
	/**
	 * Whether to use `push` or `replace` for URL updates.
	 * @default "push"
	 */
	mode?: "push" | "replace";
	/**
	 * Whether to sync on initial mount.
	 * @default true
	 */
	syncOnMount?: boolean;
};

// =============================================================================
// PERSISTENCE
// =============================================================================

/**
 * Storage interface for persistence.
 * Compatible with `localStorage`, `sessionStorage`, or custom implementations.
 */
export type PersistStorage = {
	getItem: (key: string) => string | null | Promise<string | null>;
	setItem: (key: string, value: string) => void | Promise<void>;
	removeItem: (key: string) => void | Promise<void>;
};

/**
 * Data structure persisted to storage.
 */
export type PersistedState<Steps extends Step[]> = {
	/** The current step ID. */
	stepId: Get.Id<Steps>;
	/** The metadata state. */
	metadata: StepMetadata<Steps>;
	/** The status of each step. */
	statuses: StepStatuses<Steps>;
	/** Timestamp of when the state was persisted. */
	timestamp: number;
};

/**
 * Configuration for state persistence.
 *
 * @typeParam Steps - The array of step definitions.
 */
export type PersistConfig<Steps extends Step[]> = {
	/** Storage key for the persisted state. */
	key: string;
	/**
	 * Storage implementation to use.
	 * @default localStorage (in browser environments)
	 */
	storage?: PersistStorage;
	/**
	 * Time-to-live in milliseconds. State older than this will be discarded.
	 * @default undefined (no expiration)
	 */
	ttl?: number;
	/**
	 * Custom serializer for the state.
	 * @default JSON.stringify
	 */
	serialize?: (state: PersistedState<Steps>) => string;
	/**
	 * Custom deserializer for the state.
	 * @default JSON.parse
	 */
	deserialize?: (value: string) => PersistedState<Steps>;
	/**
	 * Filter which parts of the state to persist.
	 * @default Persists everything
	 */
	partialize?: (state: PersistedState<Steps>) => Partial<PersistedState<Steps>>;
};

// =============================================================================
// STEPPER CONFIG
// =============================================================================

/**
 * Initial state returned by async initialization.
 */
export type InitialState<Steps extends Step[]> = {
	/** The step ID to start on. */
	step?: Get.Id<Steps>;
	/** Initial metadata values. */
	metadata?: Partial<StepMetadata<Steps>>;
	/** Initial status values. */
	statuses?: Partial<StepStatuses<Steps>>;
};

/**
 * Configuration options for the stepper.
 *
 * @typeParam Steps - The array of step definitions.
 */
export type StepperConfig<Steps extends Step[]> = {
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
	 * Function to fetch initial data synchronously or asynchronously.
	 * Useful for SSR, resuming from server state, or fetching saved progress.
	 */
	initialData?: () => Promise<InitialState<Steps>> | InitialState<Steps>;
	/**
	 * Router configuration for URL synchronization.
	 */
	router?: RouterConfig<Steps>;
	/**
	 * Persistence configuration for saving state.
	 */
	persist?: PersistConfig<Steps>;
	/**
	 * Callback executed before any transition.
	 * Return `false` to prevent the transition.
	 *
	 * @param ctx - The transition context.
	 * @returns `true` to allow, `false` to prevent.
	 */
	onBeforeTransition?: (ctx: TransitionContext<Steps>) => boolean | Promise<boolean>;
	/**
	 * Callback executed after any transition completes.
	 *
	 * @param ctx - The transition context.
	 */
	onAfterTransition?: (ctx: TransitionContext<Steps>) => void | Promise<void>;
};

// =============================================================================
// STEPPER INSTANCE
// =============================================================================

/**
 * History entry for undo/redo functionality.
 */
export type HistoryEntry<Steps extends Step[]> = {
	/** The step at this point in history. */
	step: Steps[number];
	/** The step index at this point in history. */
	index: number;
	/** Timestamp of when this entry was created. */
	timestamp: number;
};

/**
 * The main stepper instance returned by `useStepper`.
 * Provides all methods and state for controlling the stepper.
 *
 * @typeParam Steps - The array of step definitions.
 */
export type Stepper<Steps extends Step[] = Step[]> = {
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
	/**
	 * Progress percentage (0-100).
	 * Calculated based on completed steps.
	 */
	readonly progress: number;
	/** Array of completed steps. */
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
	 * Check if a step's dependencies are satisfied.
	 * @param id - The step ID.
	 * @returns `true` if all required steps are completed.
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
	 * @param callback - The callback to execute.
	 */
	beforeNext: (callback: () => Promise<boolean> | boolean) => Promise<void>;
	/**
	 * Execute a callback after navigating to the next step.
	 * @param callback - The callback to execute.
	 */
	afterNext: (callback: () => Promise<void> | void) => Promise<void>;
	/**
	 * Execute a callback before navigating to the previous step.
	 * If callback returns `false`, navigation is cancelled.
	 * @param callback - The callback to execute.
	 */
	beforePrev: (callback: () => Promise<boolean> | boolean) => Promise<void>;
	/**
	 * Execute a callback after navigating to the previous step.
	 * @param callback - The callback to execute.
	 */
	afterPrev: (callback: () => Promise<void> | void) => Promise<void>;
	/**
	 * Execute a callback before navigating to a specific step.
	 * If callback returns `false`, navigation is cancelled.
	 * @param id - The target step ID.
	 * @param callback - The callback to execute.
	 */
	beforeGoTo: (id: Get.Id<Steps>, callback: () => Promise<boolean> | boolean) => Promise<void>;
	/**
	 * Execute a callback after navigating to a specific step.
	 * @param id - The target step ID.
	 * @param callback - The callback to execute.
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
// UTILITIES TYPE
// =============================================================================

/**
 * Utility functions for working with steps.
 * These are pure functions that don't depend on React state.
 *
 * @typeParam Steps - The array of step definitions.
 */
export type Utils<Steps extends Step[] = Step[]> = {
	/**
	 * Get all steps.
	 * @returns The array of all steps.
	 */
	getAll: () => Steps;
	/**
	 * Get a step by its ID.
	 * @param id - The step ID.
	 * @returns The step object.
	 */
	get: <Id extends Get.Id<Steps>>(id: Id) => Get.StepById<Steps, Id>;
	/**
	 * Get the index of a step by its ID.
	 * @param id - The step ID.
	 * @returns The step index.
	 */
	getIndex: <Id extends Get.Id<Steps>>(id: Id) => number;
	/**
	 * Get a step by its index.
	 * @param index - The step index.
	 * @returns The step object.
	 */
	getByIndex: <Index extends number>(index: Index) => Steps[Index];
	/**
	 * Get the first step.
	 * @returns The first step.
	 */
	getFirst: () => Steps[0];
	/**
	 * Get the last step.
	 * @returns The last step.
	 */
	getLast: () => Steps[number];
	/**
	 * Get the next step after the specified step.
	 * @param id - The current step ID.
	 * @returns The next step or `undefined` if at the end.
	 */
	getNext: <Id extends Get.Id<Steps>>(id: Id) => Steps[number] | undefined;
	/**
	 * Get the previous step before the specified step.
	 * @param id - The current step ID.
	 * @returns The previous step or `undefined` if at the beginning.
	 */
	getPrev: <Id extends Get.Id<Steps>>(id: Id) => Steps[number] | undefined;
	/**
	 * Get the neighboring steps (previous and next).
	 * @param id - The current step ID.
	 * @returns Object with `prev` and `next` steps.
	 */
	getNeighbors: <Id extends Get.Id<Steps>>(id: Id) => {
		prev: Steps[number] | undefined;
		next: Steps[number] | undefined;
	};
	/**
	 * Check if a step exists.
	 * @param id - The step ID to check.
	 * @returns `true` if the step exists.
	 */
	has: (id: string) => id is Get.Id<Steps>;
	/**
	 * Get the total number of steps.
	 * @returns The step count.
	 */
	count: () => number;
};

// =============================================================================
// TYPE UTILITIES NAMESPACE
// =============================================================================

/**
 * Namespace containing utility types for working with steps.
 */
export namespace Get {
	/**
	 * Extracts a union of all step IDs from a steps array.
	 *
	 * @example
	 * ```ts
	 * type Steps = [{ id: "a" }, { id: "b" }];
	 * type Ids = Get.Id<Steps>; // "a" | "b"
	 * ```
	 */
	export type Id<Steps extends Step[] = Step[]> = Steps[number]["id"];

	/**
	 * Extracts a specific step type by its ID.
	 *
	 * @example
	 * ```ts
	 * type Steps = [{ id: "a"; title: string }, { id: "b"; count: number }];
	 * type StepA = Get.StepById<Steps, "a">; // { id: "a"; title: string }
	 * ```
	 */
	export type StepById<Steps extends Step[], Id extends Get.Id<Steps>> = Extract<
		Steps[number],
		{ id: Id }
	>;

	/**
	 * Extracts all steps except the one with the given ID.
	 *
	 * @example
	 * ```ts
	 * type Steps = [{ id: "a" }, { id: "b" }, { id: "c" }];
	 * type OtherSteps = Get.StepSansId<Steps, "a">; // { id: "b" } | { id: "c" }
	 * ```
	 */
	export type StepSansId<Steps extends Step[], Id extends Get.Id<Steps>> = Exclude<
		Steps[number],
		{ id: Id }
	>;

	/**
	 * Creates a switch-case style type for step handlers.
	 *
	 * @example
	 * ```ts
	 * type Steps = [{ id: "a" }, { id: "b" }];
	 * type Handlers = Get.Switch<Steps, JSX.Element>;
	 * // { a?: (step: { id: "a" }) => JSX.Element; b?: (step: { id: "b" }) => JSX.Element }
	 * ```
	 */
	export type Switch<Steps extends Step[], R> = {
		[Id in Get.Id<Steps>]?: (step: Get.StepById<Steps, Id>) => R;
	};

	/**
	 * Extracts metadata type for a specific step.
	 */
	export type MetadataFor<Steps extends Step[], Id extends Get.Id<Steps>> =
		StepMetadata<Steps>[Id];
}

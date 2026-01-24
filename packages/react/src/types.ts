import type {
	Get,
	HistoryEntry,
	InitialState,
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
import type {
	ActionsProps,
	ContentProps,
	DescriptionProps,
	IndicatorProps,
	ItemProps,
	ListProps,
	NextProps,
	Orientation,
	PrevProps,
	RootProps,
	SeparatorProps,
	TitleProps,
	TriggerProps,
} from "./primitives/types";

// =============================================================================
// ASYNC INITIALIZATION TYPES
// =============================================================================

/**
 * Function that returns initial data synchronously or asynchronously.
 * Used for SSR, resuming from server state, or fetching saved progress.
 *
 * @typeParam Steps - The array of step definitions.
 */
export type InitialDataFn<Steps extends Step[]> = () =>
	| InitialState<Steps>
	| Promise<InitialState<Steps>>;

/**
 * Stepper status reflecting initialization state.
 */
export type StepperStatus = "pending" | "success" | "error";

/**
 * Error information for failed initialization.
 */
export type StepperError = {
	/** The error that occurred. */
	error: unknown;
	/** Timestamp of when the error occurred. */
	timestamp: number;
};

/**
 * Comprehensive information about a step, including its definition, status, metadata, and helper methods.
 */
export type StepInfo<Steps extends Step[], Id extends Get.Id<Steps>> = {
	/** The step data definition. */
	readonly data: Get.StepById<Steps, Id>;
	/** The step's current status. */
	readonly status: StepStatus;
	/** The step's metadata. */
	readonly metadata: StepMetadata<Steps>[Id];
	/** `true` if the step is completed (status is "success"). */
	readonly isCompleted: boolean;
	/** `true` if the step can be accessed (dependencies satisfied). */
	readonly canAccess: boolean;
	/** Set the status of this step. */
	setStatus: (status: StepStatus) => void;
	/** Set the metadata of this step. */
	setMetadata: (values: StepMetadata<Steps>[Id]) => void;
};

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

	/** Array of all steps with full information. This is the source of truth. */
	readonly steps: StepInfo<Steps, Get.Id<Steps>>[];
	/** The current active step (derived from steps[currentIndex]). */
	readonly current: StepInfo<Steps, Get.Id<Steps>>;
	/** Index of the current step. */
	readonly currentIndex: number;
	/** `true` if the current step is the first step (derived). */
	readonly isFirst: boolean;
	/** `true` if the current step is the last step (derived). */
	readonly isLast: boolean;
	/** Progress percentage (0-100) based on completed steps (derived). */
	readonly progress: number;
	/** Array of completed steps (derived). */
	readonly completedSteps: StepInfo<Steps, Get.Id<Steps>>[];

	// -------------------------------------------------------------------------
	// Navigation
	// -------------------------------------------------------------------------

	/**
	 * Navigate to the next step.
	 * @throws Error if already on the last step.
	 * @returns Promise that resolves when navigation completes.
	 */
	next: () => Promise<void>;
	/**
	 * Navigate to the previous step.
	 * @throws Error if already on the first step.
	 * @returns Promise that resolves when navigation completes.
	 */
	prev: () => Promise<void>;
	/**
	 * Navigate to a specific step by ID.
	 * @param id - The step ID to navigate to.
	 * @throws Error if step ID is not found.
	 * @returns Promise that resolves when navigation completes.
	 */
	goTo: (id: Get.Id<Steps>) => Promise<void>;
	/**
	 * Reset the stepper to its initial state.
	 * @param options - Reset options.
	 */
	reset: (options?: {
		/** If `true`, keeps the current metadata values. */
		keepMetadata?: boolean;
		/** If `true`, keeps the current status values. */
		keepStatuses?: boolean;
		/** If `true`, clears the persisted state from storage. */
		clearPersisted?: boolean;
	}) => void;

	// -------------------------------------------------------------------------
	// Step Access
	// -------------------------------------------------------------------------

	/**
	 * Get comprehensive information about a step by its ID.
	 * @param id - The step ID.
	 * @returns Step information including definition, status, metadata, and helper methods.
	 */
	step: <Id extends Get.Id<Steps>>(id: Id) => StepInfo<Steps, Id>;

	// -------------------------------------------------------------------------
	// Metadata Management
	// -------------------------------------------------------------------------

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

	// -------------------------------------------------------------------------
	// Initialization Status
	// -------------------------------------------------------------------------

	/**
	 * Stepper initialization status.
	 * - "pending": Loading initial data (from initialData or persistence)
	 * - "success": Stepper is ready to use
	 * - "error": Initialization failed
	 */
	readonly initStatus: StepperStatus;
	/**
	 * Error information if initStatus is "error".
	 * `null` when initStatus is "pending" or "success".
	 */
	readonly error: StepperError | null;
	/**
	 * Retry initialization if initStatus is "error".
	 */
	retry: () => void;

	// -------------------------------------------------------------------------
	// Transition Status
	// -------------------------------------------------------------------------

	/**
	 * `true` when a transition is in progress (e.g., during async callbacks like beforeNext, afterNext, etc.).
	 * Useful for showing loading states during step transitions.
	 */
	readonly isTransitioning: boolean;

	// -------------------------------------------------------------------------
	// Persistence
	// -------------------------------------------------------------------------

	/**
	 * Clear persisted state from storage.
	 * Only has effect when `persist` is configured.
	 */
	clearPersistedState: () => Promise<void>;
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
 * Type-safe primitives returned by defineStepper.
 * These primitives are bound to the specific steps, providing full type safety.
 */
export type TypedStepperPrimitives<Steps extends Step[]> = {
	Root: React.ForwardRefExoticComponent<
		Omit<RootProps<Steps>, "stepper" | "stepperContext" | "children"> &
			Omit<ScopedProps<Steps>, "children"> &
			React.RefAttributes<HTMLDivElement> & {
				orientation?: Orientation;
				tracking?: boolean;
				/**
				 * Children can be a ReactNode or a function that receives the stepper instance.
				 * The stepper is automatically obtained from the Scoped context (created internally).
				 * Root internally uses Scoped, so you don't need to wrap it in Stepper.Provider or Stepper.Scoped.
				 *
				 * @example
				 * ```tsx
				 * <Stepper.Root>
				 *   {({ stepper }) => (
				 *     <Stepper.List>
				 *       {stepper.steps.map((stepInfo) => (
				 *         <Stepper.Item key={stepInfo.data.id} step={stepInfo.data.id}>
				 *           <Stepper.Trigger>{stepInfo.data.title}</Stepper.Trigger>
				 *         </Stepper.Item>
				 *       ))}
				 *     </Stepper.List>
				 *   )}
				 * </Stepper.Root>
				 * ```
				 */
				children?:
					| React.ReactNode
					| ((props: { stepper: StepperInstance<Steps> }) => React.ReactNode);
			}
	>;
	List: React.ForwardRefExoticComponent<
		ListProps & React.RefAttributes<HTMLOListElement>
	>;
	Item: React.ForwardRefExoticComponent<
		Omit<ItemProps<Steps>, "step"> &
			React.RefAttributes<HTMLLIElement> & {
				step: Get.Id<Steps>;
			}
	>;
	Trigger: React.ForwardRefExoticComponent<
		TriggerProps & React.RefAttributes<HTMLButtonElement>
	>;
	Indicator: React.ForwardRefExoticComponent<
		IndicatorProps & React.RefAttributes<HTMLSpanElement>
	>;
	Separator: React.ForwardRefExoticComponent<
		SeparatorProps & React.RefAttributes<HTMLHRElement>
	>;
	Title: React.ForwardRefExoticComponent<
		TitleProps & React.RefAttributes<HTMLSpanElement>
	>;
	Description: React.ForwardRefExoticComponent<
		DescriptionProps & React.RefAttributes<HTMLSpanElement>
	>;
	Content: React.ForwardRefExoticComponent<
		Omit<ContentProps<Steps>, "step"> &
			React.RefAttributes<HTMLDivElement> & {
				step?: Get.Id<Steps>;
			}
	>;
	Actions: React.ForwardRefExoticComponent<
		ActionsProps & React.RefAttributes<HTMLDivElement>
	>;
	Prev: React.ForwardRefExoticComponent<
		PrevProps & React.RefAttributes<HTMLButtonElement>
	>;
	Next: React.ForwardRefExoticComponent<
		NextProps & React.RefAttributes<HTMLButtonElement>
	>;
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
	/**
	 * Type-safe primitives bound to these specific steps.
	 * Use these components for full type safety and autocomplete.
	 *
	 * @example
	 * ```tsx
	 * const { Stepper } = defineStepper(
	 *   { id: "shipping", title: "Shipping" },
	 *   { id: "payment", title: "Payment" }
	 * );
	 *
	 * <Stepper.Root stepper={stepper}>
	 *   <Stepper.List>
	 *     <Stepper.Item step="shipping">...</Stepper.Item>
	 *     <Stepper.Item step="payment">...</Stepper.Item>
	 *   </Stepper.List>
	 * </Stepper.Root>
	 * ```
	 */
	Stepper: TypedStepperPrimitives<Steps>;
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
	 * Async function to fetch initial state.
	 * Useful for SSR, resuming from server state, or fetching saved progress.
	 *
	 * The returned data is merged with sync `initialStep`/`initialMetadata`/`initialStatuses`,
	 * with async values taking precedence.
	 *
	 * @example
	 * ```ts
	 * .config({
	 *   initialData: async () => {
	 *     const savedProgress = await api.getSavedProgress();
	 *     return {
	 *       step: savedProgress.currentStep,
	 *       metadata: savedProgress.formData,
	 *       statuses: savedProgress.completedSteps,
	 *     };
	 *   }
	 * })
	 * ```
	 */
	initialData?: InitialDataFn<Steps>;
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
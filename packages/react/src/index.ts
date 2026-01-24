// =============================================================================
// TYPES RE-EXPORTED FROM CORE
// =============================================================================

export type {
	Get,
	HistoryEntry,
	InitialState,
	PersistedState,
	PersistConfig,
	PersistManager,
	PersistStorage,
	RouterAdapter,
	RouterConfig,
	Step,
	StepMetadata,
	StepperConfig,
	StepStatus,
	StepStatuses,
	TransitionContext,
	TransitionDirection,
	Utils,
} from "@stepperize/core";

// Re-export persistence utilities
export {
	createMemoryStorage,
	createPersistManager,
	localStorageAdapter,
	sessionStorageAdapter,
} from "@stepperize/core";

// =============================================================================
// REACT-SPECIFIC TYPES
// =============================================================================

export type {
	// Initial data types
	InitialDataFn,
	StepperError,
	StepperStatus,
	// Step info
	StepInfo,
	// Component props
	ScopedProps,
	// Stepper types
	StepperBuilder,
	StepperConfigOptions,
	StepperDefinition,
	StepperInstance,
	UseStepperProps,
} from "./types";

// =============================================================================
// MAIN API
// =============================================================================

export { defineStepper, isStepperReady } from "./define-stepper";

// =============================================================================
// TYPES RE-EXPORTED FROM CORE
// =============================================================================

export type {
	BaseStepStatus,
	Get,
	HistoryEntry,
	Initial,
	InitialState,
	PersistedState,
	PersistConfig,
	PersistManager,
	PersistStorage,
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
	// Status types
	StepperError,
	StepperStatus,
	// Step info
	StepInfo,
	// Component props
	ScopedProps,
	// Stepper types
	StepperConfigOptions,
	StepperDefinition,
	StepperInstance,
	UseStepperProps,
} from "./types";

// =============================================================================
// MAIN API
// =============================================================================

export { defineStepper, isStepperReady } from "./define-stepper";

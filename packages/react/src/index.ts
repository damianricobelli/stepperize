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
	ZodType,
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
	// Async initialization types
	AsyncInitError,
	AsyncInitState,
	AsyncInitStatus,
	GetInitialStateFn,
	// Component props
	ScopedProps,
	// Stepper types
	StepperBuilder,
	StepperConfigOptions,
	StepperDefinition,
	StepperInstance,
	StepperReturn, // Legacy alias
	UseStepperProps,
} from "./types";

// =============================================================================
// MAIN API
// =============================================================================

export { defineStepper, isStepperReady, useWaitForAsyncInit } from "./define-stepper";

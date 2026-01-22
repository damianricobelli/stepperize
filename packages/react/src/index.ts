// =============================================================================
// TYPES RE-EXPORTED FROM CORE
// =============================================================================

export type {
	Get,
	HistoryEntry,
	PersistConfig,
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

// =============================================================================
// REACT-SPECIFIC TYPES
// =============================================================================

export type {
	ScopedProps,
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

export { defineStepper } from "./define-stepper";

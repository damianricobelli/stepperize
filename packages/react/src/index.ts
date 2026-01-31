// =============================================================================
// TYPES RE-EXPORTED FROM CORE
// =============================================================================

export type {
	BaseStepStatus,
	Get,
	Initial,
	InitialState,
	Step,
	StepMetadata,
	StepperConfig,
	StepStatus,
	StepStatuses,
	TransitionContext,
	TransitionDirection,
	Utils,
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

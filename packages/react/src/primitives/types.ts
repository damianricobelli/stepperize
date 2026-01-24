import type { Get, Step, StepStatus } from "@stepperize/core";
import type * as React from "react";
import type { StepperInstance } from "../types";

// =============================================================================
// DATA ATTRIBUTES
// =============================================================================

/**
 * State for step-related primitives.
 */
export type StepState = "active" | "completed" | "inactive";

/**
 * Orientation for the stepper layout.
 */
export type Orientation = "horizontal" | "vertical";

/**
 * Common data attributes for all primitives.
 */
export type CommonDataAttributes = {
	"data-orientation"?: Orientation;
};

/**
 * Data attributes for step-related primitives.
 */
export type StepDataAttributes = CommonDataAttributes & {
	"data-state"?: StepState | StepStatus | string;
	"data-disabled"?: string;
	"data-first"?: string;
	"data-last"?: string;
	"data-step"?: string;
	"data-index"?: number;
};

// =============================================================================
// RENDER PROP PATTERN
// =============================================================================

/**
 * Props passed to custom render functions.
 * Includes all HTML attributes plus data attributes.
 */
export type RenderProps<E extends React.ElementType = "div"> =
	React.ComponentPropsWithoutRef<E> & StepDataAttributes;

/**
 * Render prop type for custom rendering.
 */
export type RenderProp<E extends React.ElementType = "div"> = (
	props: RenderProps<E>,
) => React.ReactElement | null;

/**
 * Base props that support the render prop pattern.
 */
export type PrimitiveProps<E extends React.ElementType = "div"> =
	Omit<React.ComponentPropsWithoutRef<E>, "children"> & {
		/**
		 * Custom render function for complete control over the rendered element.
		 * Receives all props including data attributes, event handlers, and ARIA attributes.
		 */
		render?: RenderProp<E>;
		/**
		 * Whether to render as a Slot (merge with single child).
		 */
		asChild?: boolean;
		/**
		 * Children can be a ReactNode or a function receiving step info.
		 */
		children?: React.ReactNode;
	};

// =============================================================================
// PRIMITIVE CONTEXT
// =============================================================================

/**
 * Configuration for the primitives.
 */
export type PrimitiveConfig = {
	/**
	 * Orientation of the stepper.
	 * @default "horizontal"
	 */
	orientation?: Orientation;
	/**
	 * Whether to track/scroll into view on step change.
	 * @default false
	 */
	tracking?: boolean;
};

/**
 * Context value for primitives.
 */
export type PrimitiveContextValue<Steps extends Step[] = Step[]> = {
	/** The stepper instance from useStepper. */
	stepper: StepperInstance<Steps>;
	/** Primitive configuration. */
	config: Required<PrimitiveConfig>;
};

/**
 * Context for the current step item (used by nested primitives).
 */
export type StepItemContextValue<Steps extends Step[] = Step[]> = {
	/** The step definition. */
	step: Steps[number];
	/** The step index. */
	index: number;
	/** Whether this step is currently active. */
	isActive: boolean;
	/** Whether this step is completed. */
	isCompleted: boolean;
	/** The computed state of the step. */
	state: StepState;
	/** Whether this is the first step. */
	isFirst: boolean;
	/** Whether this is the last step. */
	isLast: boolean;
	/** Whether this step is disabled. */
	disabled?: boolean;
};

// =============================================================================
// COMPONENT PROPS
// =============================================================================

/**
 * Props for the Root primitive.
 */
export type RootProps<Steps extends Step[] = Step[]> = PrimitiveProps<"div"> &
	PrimitiveConfig & {
		/**
		 * React Context from Scoped provider.
		 * If provided, Root will use this context to obtain the stepper automatically.
		 * This is automatically provided by TypedRoot, so you don't need to pass it.
		 * If not provided, stepper prop is required.
		 */
		stepperContext?: React.Context<StepperInstance<Steps> | null>;
		/**
		 * The stepper instance from useStepper.
		 * Required if stepperContext is not provided.
		 * If stepperContext is provided, this prop is ignored.
		 * When using TypedRoot (Stepper.Root), this is not needed as it's obtained from Scoped context.
		 */
		stepper?: StepperInstance<Steps>;
	};

/**
 * Props for the List primitive.
 */
export type ListProps = PrimitiveProps<"ol">;

/**
 * Props for the Item primitive.
 */
export type ItemProps<Steps extends Step[] = Step[]> = PrimitiveProps<"li"> & {
	/**
	 * The step ID this item represents.
	 */
	step: Get.Id<Steps>;
	/**
	 * Whether this step item is disabled.
	 */
	disabled?: boolean;
};

/**
 * Props for the Trigger primitive.
 */
export type TriggerProps = PrimitiveProps<"button"> & {
	/**
	 * Click handler override. If not provided, navigates to the step.
	 */
	onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

/**
 * Props for the Indicator primitive.
 */
export type IndicatorProps = PrimitiveProps<"span"> & {
	/**
	 * Custom content to render (icon, number, etc).
	 * If not provided, renders the step index + 1.
	 */
	children?: React.ReactNode;
};

/**
 * Props for the Separator primitive.
 */
export type SeparatorProps = Omit<PrimitiveProps<"hr">, "children"> & {
	/**
	 * Override the orientation for this separator.
	 */
	orientation?: Orientation;
};

/**
 * Props for the Title primitive.
 */
export type TitleProps = PrimitiveProps<"span">;

/**
 * Props for the Description primitive.
 */
export type DescriptionProps = PrimitiveProps<"span">;

/**
 * Props for the Content primitive.
 */
export type ContentProps<Steps extends Step[] = Step[]> = PrimitiveProps<"div"> & {
	/**
	 * The step ID this content is for. If not provided, shows content for current step.
	 */
	step?: Get.Id<Steps>;
};

/**
 * Props for the Actions primitive.
 */
export type ActionsProps = PrimitiveProps<"div">;

/**
 * Props for the Prev primitive.
 */
export type PrevProps = PrimitiveProps<"button"> & {
	/**
	 * Whether to disable when on first step.
	 * @default true
	 */
	disableOnFirst?: boolean;
};

/**
 * Props for the Next primitive.
 */
export type NextProps = PrimitiveProps<"button"> & {
	/**
	 * Whether to disable when on last step.
	 * @default true
	 */
	disableOnLast?: boolean;
};

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Helper to get step state from current and target indices.
 */
export function getStepState(currentIndex: number, stepIndex: number): StepState {
	if (currentIndex === stepIndex) return "active";
	if (currentIndex > stepIndex) return "completed";
	return "inactive";
}

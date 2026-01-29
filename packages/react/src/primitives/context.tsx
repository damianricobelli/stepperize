import type { Step } from "@stepperize/core";
import * as React from "react";
import type {
	PrimitiveConfig,
	PrimitiveContextValue,
	StepItemContextValue,
} from "./types";

// =============================================================================
// PRIMITIVE ROOT CONTEXT
// =============================================================================

const PrimitiveContext = React.createContext<PrimitiveContextValue | null>(null);

/**
 * Hook to access the primitive context.
 * Must be used within a Root primitive.
 */
export function usePrimitiveContext<
	Steps extends Step[] = Step[],
>(): PrimitiveContextValue<Steps> {
	const context = React.useContext(PrimitiveContext);
	if (!context) {
		throw new Error(
			"[@stepperize/react] Stepper primitives must be used within a <Root> component.",
		);
	}
	return context as unknown as PrimitiveContextValue<Steps>;
}

/**
 * Provider for the primitive context.
 */
export function PrimitiveProvider<Steps extends Step[]>({
	children,
	value,
}: {
	children: React.ReactNode;
	value: PrimitiveContextValue<Steps>;
}) {
	return (
		<PrimitiveContext.Provider value={value as unknown as PrimitiveContextValue}>
			{children}
		</PrimitiveContext.Provider>
	);
}

// =============================================================================
// STEP ITEM CONTEXT
// =============================================================================

const StepItemContext = React.createContext<StepItemContextValue | null>(null);

/**
 * Hook to access the step item context.
 * Must be used within an Item primitive.
 */
export function useStepItemContext<
	Steps extends Step[] = Step[],
>(): StepItemContextValue<Steps> {
	const context = React.useContext(StepItemContext);
	if (!context) {
		throw new Error(
			"[@stepperize/react] This primitive must be used within an <Item> component.",
		);
	}
	return context as StepItemContextValue<Steps>;
}

/**
 * Optional hook that returns null if not within an Item.
 * Useful for primitives that can work both inside and outside Item.
 */
export function useMaybeStepItemContext<
	Steps extends Step[] = Step[],
>(): StepItemContextValue<Steps> | null {
	return React.useContext(StepItemContext) as StepItemContextValue<Steps> | null;
}

/**
 * Provider for the step item context.
 */
export function StepItemProvider<Steps extends Step[]>({
	children,
	value,
}: {
	children: React.ReactNode;
	value: StepItemContextValue<Steps>;
}) {
	return (
		<StepItemContext.Provider value={value as StepItemContextValue}>
			{children}
		</StepItemContext.Provider>
	);
}

// =============================================================================
// DEFAULT CONFIG
// =============================================================================

export const DEFAULT_CONFIG: Required<PrimitiveConfig> = {
	orientation: "horizontal",
	tracking: false,
};

// =============================================================================
// DATA ATTRIBUTE HELPERS
// =============================================================================

/**
 * Create data attributes for a step item.
 */
export function createStepDataAttributes(
	item: StepItemContextValue,
	orientation: "horizontal" | "vertical",
): Record<string, string | number | undefined> {
	return {
		"data-status": item.status,
		"data-disabled": item.disabled ? "true" : undefined,
		"data-first": item.isFirst ? "true" : undefined,
		"data-last": item.isLast ? "true" : undefined,
		"data-step": item.step.id,
		"data-index": item.index,
		"data-orientation": orientation,
	};
}

/**
 * Filter out undefined data attributes.
 */
export function filterDataAttributes(
	attrs: Record<string, string | number | undefined>,
): Record<string, string | number> {
	return Object.fromEntries(
		Object.entries(attrs).filter(([, v]) => v !== undefined),
	) as Record<string, string | number>;
}

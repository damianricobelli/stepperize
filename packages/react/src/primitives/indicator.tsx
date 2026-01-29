import * as React from "react";
import {
	createStepDataAttributes,
	filterDataAttributes,
	usePrimitiveContext,
	useStepItemContext,
} from "./context";
import type { IndicatorProps } from "./types";

/**
 * Indicator primitive that shows step number/icon/status.
 * Must be used within an Item component.
 *
 * @example
 * ```tsx
 * // Default: shows step number
 * <Indicator />
 *
 * // Custom: show icon
 * <Indicator>
 *   <CheckIcon />
 * </Indicator>
 *
 * // Conditional rendering based on state
 * <Indicator>
 *   {item.isCompleted ? <CheckIcon /> : item.index + 1}
 * </Indicator>
 * ```
 */
const Indicator = React.forwardRef<HTMLSpanElement, IndicatorProps>(
	({ render, children, ...props }, ref) => {
		const { config } = usePrimitiveContext();
		const item = useStepItemContext();

		const dataAttributes = filterDataAttributes(
			createStepDataAttributes(item, config.orientation),
		);

		// Default content is the step number (1-indexed)
		const content = children ?? item.index + 1;

		const elementProps = {
			"aria-hidden": true as const,
			...dataAttributes,
			...props,
			ref,
		};

		if (render) {
			return render(elementProps) ?? <span {...elementProps}>{content}</span>;
		}

		return <span {...elementProps}>{content}</span>;
	},
);

Indicator.displayName = "Stepper.Indicator";

export { Indicator };

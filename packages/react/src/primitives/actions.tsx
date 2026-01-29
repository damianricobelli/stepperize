import * as React from "react";
import { usePrimitiveContext } from "./context";
import type { ActionsProps } from "./types";

/**
 * Actions primitive that wraps navigation buttons.
 * Provides a semantic container for Prev/Next buttons.
 *
 * @example
 * ```tsx
 * <Actions>
 *   <Prev>Previous</Prev>
 *   <Next>Next</Next>
 * </Actions>
 * ```
 */
const Actions = React.forwardRef<HTMLDivElement, ActionsProps>(
	({ render, children, ...props }, ref) => {
		const { config } = usePrimitiveContext();

		const dataAttributes = {
			"data-orientation": config.orientation,
		};

		const elementProps = {
			role: "group" as const,
			"aria-label": "Step navigation",
			...dataAttributes,
			...props,
			ref,
		};

		if (render) {
			return render(elementProps) ?? <div {...elementProps}>{children}</div>;
		}

		return <div {...elementProps}>{children}</div>;
	},
);

Actions.displayName = "Stepper.Actions";

export { Actions };

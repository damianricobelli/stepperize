import * as React from "react";
import {
	createStepDataAttributes,
	filterDataAttributes,
	Slot,
	useMaybeStepItemContext,
	usePrimitiveContext,
} from "./context";
import type { SeparatorProps } from "./types";

/**
 * Separator primitive that renders a line between steps.
 * Can be used within or outside an Item component.
 *
 * @example
 * ```tsx
 * // Within Item (knows about step state)
 * <Item step="shipping">
 *   <Trigger>...</Trigger>
 *   <Separator />
 * </Item>
 *
 * // Outside Item (just renders a separator)
 * <List>
 *   <Item step="step-1">...</Item>
 *   <Separator />
 *   <Item step="step-2">...</Item>
 * </List>
 * ```
 */
const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
	({ orientation: orientationProp, asChild, render, ...props }, ref) => {
		const { config } = usePrimitiveContext();
		const item = useMaybeStepItemContext();

		const orientation = orientationProp ?? config.orientation;

		// If inside an Item and it's the last step, don't render
		if (item?.isLast) {
			return null;
		}

		const dataAttributes = item
			? filterDataAttributes({
					...createStepDataAttributes(item, orientation),
					"data-orientation": orientation,
				})
			: {
					"data-orientation": orientation,
				};

		const elementProps = {
			role: "separator" as const,
			"aria-orientation": orientation,
			tabIndex: -1,
			...dataAttributes,
			...props,
			ref,
		};

		if (render) {
			return render(elementProps) ?? <hr {...elementProps} />;
		}

		if (asChild) {
			return <Slot {...elementProps} />;
		}

		return <hr {...elementProps} />;
	},
);

Separator.displayName = "Stepper.Separator";

export { Separator };

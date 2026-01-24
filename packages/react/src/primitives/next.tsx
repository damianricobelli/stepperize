import * as React from "react";
import { Slot, usePrimitiveContext } from "./context";
import type { NextProps } from "./types";

/**
 * Next primitive that navigates to the next step.
 *
 * @example
 * ```tsx
 * <Actions>
 *   <Prev>Previous</Prev>
 *   <Next>Next</Next>
 * </Actions>
 *
 * // With custom disabled behavior
 * <Next disableOnLast={false}>
 *   {stepper.isLast ? "Finish" : "Next"}
 * </Next>
 * ```
 */
const Next = React.forwardRef<HTMLButtonElement, NextProps>(
	(
		{
			disableOnLast = true,
			onClick,
			disabled: disabledProp,
			asChild,
			render,
			children,
			...props
		},
		ref,
	) => {
		const { stepper, config } = usePrimitiveContext();

		const isDisabled = disabledProp ?? (disableOnLast && stepper.isLast);

		const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
			if (onClick) {
				onClick(e);
				return;
			}

			if (!isDisabled) {
				try {
					stepper.next();
				} catch {
					// Already at last step or navigation not allowed
				}
			}
		};

		const dataAttributes = {
			"data-disabled": isDisabled ? "true" : undefined,
			"data-orientation": config.orientation,
		};

		const elementProps = {
			type: "button" as const,
			disabled: isDisabled,
			onClick: handleClick,
			"aria-label": "Go to next step",
			...dataAttributes,
			...props,
			ref,
		};

		if (render) {
			return render(elementProps) ?? <button {...elementProps}>{children}</button>;
		}

		if (asChild) {
			return <Slot {...elementProps}>{children}</Slot>;
		}

		return <button {...elementProps}>{children}</button>;
	},
);

Next.displayName = "Stepper.Next";

export { Next };

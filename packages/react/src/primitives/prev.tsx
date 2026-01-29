import * as React from "react";
import { usePrimitiveContext } from "./context";
import type { PrevProps } from "./types";

/**
 * Prev primitive that navigates to the previous step.
 *
 * @example
 * ```tsx
 * <Actions>
 *   <Prev>Previous</Prev>
 *   <Next>Next</Next>
 * </Actions>
 *
 * // With custom disabled behavior
 * <Prev disableOnFirst={false}>
 *   Previous
 * </Prev>
 * ```
 */
const Prev = React.forwardRef<HTMLButtonElement, PrevProps>(
	(
		{
			disableOnFirst = true,
			onClick,
			disabled: disabledProp,
			render,
			children,
			...props
		},
		ref,
	) => {
		const { stepper, config } = usePrimitiveContext();

		const isDisabled = disabledProp ?? (disableOnFirst && stepper.isFirst);

		const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
			if (onClick) {
				onClick(e);
				return;
			}

			if (!isDisabled) {
				try {
					stepper.prev();
				} catch {
					// Already at first step or navigation not allowed
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
			"aria-label": "Go to previous step",
			...dataAttributes,
			...props,
			ref,
		};

		if (render) {
			return render(elementProps) ?? <button {...elementProps}>{children}</button>;
		}

		return <button {...elementProps}>{children}</button>;
	},
);

Prev.displayName = "Stepper.Prev";

export { Prev };

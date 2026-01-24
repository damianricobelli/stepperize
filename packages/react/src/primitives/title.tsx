import * as React from "react";
import {
	createStepDataAttributes,
	filterDataAttributes,
	Slot,
	useMaybeStepItemContext,
	usePrimitiveContext,
} from "./context";
import type { TitleProps } from "./types";

/**
 * Title primitive that renders the step title.
 * Can be used within an Item component to automatically get the step context.
 *
 * @example
 * ```tsx
 * <Item step="shipping">
 *   <Trigger>
 *     <Title>Shipping</Title>
 *   </Trigger>
 * </Item>
 *
 * // Or with automatic title from step definition
 * <Item step="shipping">
 *   <Trigger>
 *     <Title>{step.title}</Title>
 *   </Trigger>
 * </Item>
 * ```
 */
const Title = React.forwardRef<HTMLSpanElement, TitleProps>(
	({ asChild, render, children, ...props }, ref) => {
		const { config } = usePrimitiveContext();
		const item = useMaybeStepItemContext();

		const dataAttributes = item
			? filterDataAttributes(createStepDataAttributes(item, config.orientation))
			: { "data-orientation": config.orientation };

		const elementProps = {
			...dataAttributes,
			...props,
			ref,
		};

		if (render) {
			return render(elementProps) ?? <span {...elementProps}>{children}</span>;
		}

		if (asChild) {
			return <Slot {...elementProps}>{children}</Slot>;
		}

		return <span {...elementProps}>{children}</span>;
	},
);

Title.displayName = "Stepper.Title";

export { Title };

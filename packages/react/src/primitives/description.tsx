import * as React from "react";
import {
	createStepDataAttributes,
	filterDataAttributes,
	Slot,
	useMaybeStepItemContext,
	usePrimitiveContext,
} from "./context";
import type { DescriptionProps } from "./types";

/**
 * Description primitive that renders the step description.
 * Can be used within an Item component to automatically get the step context.
 *
 * @example
 * ```tsx
 * <Item step="shipping">
 *   <Trigger>
 *     <Title>Shipping</Title>
 *     <Description>Enter your shipping address</Description>
 *   </Trigger>
 * </Item>
 * ```
 */
const Description = React.forwardRef<HTMLSpanElement, DescriptionProps>(
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

Description.displayName = "Stepper.Description";

export { Description };

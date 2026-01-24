import * as React from "react";
import { Slot, usePrimitiveContext } from "./context";
import type { ListProps } from "./types";

/**
 * List primitive that contains step items.
 * Renders as an `<ol>` by default for semantic correctness.
 *
 * @example
 * ```tsx
 * <List>
 *   {stepper.steps.map((stepInfo) => (
 *     <Item key={step.id} step={step.id}>
 *       <Trigger />
 *     </Item>
 *   ))}
 * </List>
 * ```
 */
const List = React.forwardRef<HTMLOListElement, ListProps>(
	({ asChild, render, children, ...props }, ref) => {
		const { config } = usePrimitiveContext();

		const dataAttributes = {
			"data-orientation": config.orientation,
			"data-stepper-list": "",
		};

		const elementProps = {
			role: "tablist",
			"aria-orientation": config.orientation,
			...dataAttributes,
			...props,
			ref,
		};

		if (render) {
			return render(elementProps) ?? <ol {...elementProps}>{children}</ol>;
		}

		if (asChild) {
			return <Slot {...elementProps}>{children}</Slot>;
		}

		return <ol {...elementProps}>{children}</ol>;
	},
);

List.displayName = "Stepper.List";

export { List };

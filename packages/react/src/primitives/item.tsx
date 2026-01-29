import type { Get, Step } from "@stepperize/core";
import * as React from "react";
import {
	createStepDataAttributes,
	filterDataAttributes,
	StepItemProvider,
	usePrimitiveContext,
} from "./context";
import type { ItemProps, StepItemContextValue } from "./types";

/**
 * Item primitive that wraps a single step.
 * Provides context for nested primitives (Trigger, Indicator, Title, etc.)
 *
 * @example
 * ```tsx
 * <Item step="shipping">
 *   <Trigger>
 *     <Indicator />
 *     <Title>Shipping</Title>
 *   </Trigger>
 * </Item>
 * ```
 */
function ItemImpl<Steps extends Step[] = Step[]>(
	{
		step: stepId,
		disabled,
		render,
		children,
		...props
	}: ItemProps<Steps>,
	ref: React.ForwardedRef<HTMLLIElement>,
) {
	const { stepper, config } = usePrimitiveContext<Steps>();

	// Get step info - status is already resolved in stepInfo
	const stepIndex = stepper.steps.findIndex(
		(s) => s.data.id === (stepId as string),
	);
	const stepInfo = stepper.steps[stepIndex];

	if (!stepInfo) {
		console.warn(
			`[@stepperize/react] Item: Step "${String(stepId)}" not found.`,
		);
		return null;
	}

	const step = stepInfo.data;
	const isFirst = stepIndex === 0;
	const isLast = stepIndex === stepper.steps.length - 1;
	// Use the resolved status from stepInfo
	const status = stepInfo.status;
	const isActive = status === "active";
	const isCompleted = status === "success";

	const itemContext = React.useMemo<StepItemContextValue<Steps>>(
		() => ({
			step,
			index: stepIndex,
			isActive,
			isCompleted,
			status,
			isFirst,
			isLast,
			disabled,
		}),
		[step, stepIndex, isActive, isCompleted, status, isFirst, isLast, disabled],
	);

	const dataAttributes = filterDataAttributes(
		createStepDataAttributes(itemContext, config.orientation),
	);

	const elementProps = {
		role: "presentation",
		...dataAttributes,
		...props,
		ref,
	};

	let element: React.ReactElement;

	if (render) {
		element = render(elementProps) ?? <li {...elementProps}>{children}</li>;
	} else {
		element = <li {...elementProps}>{children}</li>;
	}

	return <StepItemProvider value={itemContext}>{element}</StepItemProvider>;
}

const Item = React.forwardRef(ItemImpl) as <Steps extends Step[] = Step[]>(
	props: ItemProps<Steps> & { ref?: React.ForwardedRef<HTMLLIElement> },
) => React.ReactElement | null;

(Item as React.FC).displayName = "Stepper.Item";

export { Item };

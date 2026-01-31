import type { Step } from "@stepperize/core";
import * as React from "react";
import {
	useMaybeStepItemContext,
	usePrimitiveContext,
} from "./context";
import type { ContentProps } from "./types";

/**
 * Content primitive that renders the step panel content.
 * Shows content for the current step by default, or for a specific step if `step` prop is provided.
 *
 * @example
 * ```tsx
 * // Show content for current step
 * <Content>
 *   {stepper.current.data.id === "shipping" && <ShippingForm />}
 * </Content>
 *
 * // Show content for specific step (useful with stepper.switch)
 * {stepper.switch({
 *   shipping: () => <Content step="shipping"><ShippingForm /></Content>,
 *   payment: () => <Content step="payment"><PaymentForm /></Content>,
 * })}
 * ```
 */
function ContentImpl<Steps extends Step[] = Step[]>(
	{ step: stepId, render, children, ...props }: ContentProps<Steps>,
	ref: React.ForwardedRef<HTMLDivElement>,
) {
	const { stepper, config } = usePrimitiveContext<Steps>();
	const item = useMaybeStepItemContext<Steps>();

	// Determine which step this content is for
	const targetStepId = stepId ?? item?.step.id ?? stepper.current.data.id;
	const isActive = stepper.current.data.id === targetStepId;

	// Get step info for data attributes
	const stepIndex = stepper.steps.findIndex((s) => s.data.id === targetStepId);
	const stepInfo = stepper.steps[stepIndex];
	const step = stepInfo?.data;

	if (!step) {
		console.warn(
			`[@stepperize/react] Content: Step "${String(targetStepId)}" not found.`,
		);
		return null;
	}

	// Handle tracking (scroll into view)
	const elementRef = React.useRef<HTMLDivElement>(null);
	const mergedRef = React.useMemo(
		() => (node: HTMLDivElement | null) => {
			elementRef.current = node;
			if (typeof ref === "function") {
				ref(node);
			} else if (ref) {
				ref.current = node;
			}
		},
		[ref],
	);

	React.useEffect(() => {
		if (config.tracking && isActive && elementRef.current) {
			elementRef.current.scrollIntoView({
				behavior: "smooth",
				block: "center",
			});
		}
	}, [config.tracking, isActive]);

	const dataAttributes = {
		"data-status": stepInfo.status,
		"data-step": step.id,
		"data-index": stepIndex,
		"data-orientation": config.orientation,
	};

	const elementProps = {
		role: "tabpanel",
		id: `step-content-${step.id}`,
		"aria-labelledby": `step-trigger-${step.id}`,
		hidden: !isActive,
		tabIndex: 0,
		...dataAttributes,
		...props,
		ref: mergedRef,
	};

	// Don't render hidden content (optional: can be changed to CSS hidden)
	if (!isActive) {
		return null;
	}

	if (render) {
		return render(elementProps) ?? <div {...elementProps}>{children}</div>;
	}

	return <div {...elementProps}>{children}</div>;
}

const Content = React.forwardRef(ContentImpl) as <Steps extends Step[] = Step[]>(
	props: ContentProps<Steps> & { ref?: React.ForwardedRef<HTMLDivElement> },
) => React.ReactElement | null;

(Content as React.FC).displayName = "Stepper.Content";

export { Content };

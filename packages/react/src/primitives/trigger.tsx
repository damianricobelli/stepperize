import type { Get, Step } from "@stepperize/core";
import * as React from "react";
import {
	createStepDataAttributes,
	filterDataAttributes,
	Slot,
	usePrimitiveContext,
	useStepItemContext,
} from "./context";
import type { TriggerProps } from "./types";

/**
 * Trigger primitive that makes a step clickable.
 * Must be used within an Item component.
 *
 * Features:
 * - Keyboard navigation (Arrow keys)
 * - ARIA tab role
 * - Focus management
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
const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
	({ onClick, asChild, render, children, disabled: disabledProp, ...props }, ref) => {
		const { stepper, config } = usePrimitiveContext();
		const item = useStepItemContext();

		const disabled = disabledProp ?? item.disabled;
		const isDisabled = disabled || item.state === "inactive";

		const handleClick: React.MouseEventHandler<HTMLButtonElement> = (e) => {
			if (onClick) {
				onClick(e);
				return;
			}

			if (!disabled) {
				try {
					stepper.goTo(item.step.id as Get.Id<Step[]>);
				} catch {
					// Navigation not allowed (e.g., in linear mode)
				}
			}
		};

		const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
			const { key } = e;
			const isHorizontal = config.orientation === "horizontal";

			const nextKeys = isHorizontal ? ["ArrowRight"] : ["ArrowDown"];
			const prevKeys = isHorizontal ? ["ArrowLeft"] : ["ArrowUp"];

			if ([...nextKeys, ...prevKeys].includes(key)) {
				e.preventDefault();

				const direction = nextKeys.includes(key) ? 1 : -1;
				const targetIndex = item.index + direction;

				if (targetIndex >= 0 && targetIndex < stepper.steps.length) {
					const targetStep = stepper.steps[targetIndex].data;
					const targetElement = document.querySelector(
						`[data-step="${targetStep.id}"] button`,
					) as HTMLElement | null;

					targetElement?.focus();
				}
			}
		};

		const dataAttributes = filterDataAttributes(
			createStepDataAttributes(item, config.orientation),
		);

		const elementProps = {
			type: "button" as const,
			role: "tab",
			id: `step-trigger-${item.step.id}`,
			"aria-selected": item.isActive,
			"aria-controls": `step-content-${item.step.id}`,
			"aria-current": item.isActive ? ("step" as const) : undefined,
			"aria-posinset": item.index + 1,
			"aria-setsize": stepper.steps.length,
			tabIndex: item.isActive ? 0 : -1,
			disabled: isDisabled,
			onClick: handleClick,
			onKeyDown: handleKeyDown,
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

Trigger.displayName = "Stepper.Trigger";

export { Trigger };

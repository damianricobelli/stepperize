import type { Get, Step } from "@stepperize/core";
import type React from "react";
import type { StepperScope } from "./context";
import { panelDomId, triggerDomId } from "./context";
import { runClick } from "./nav";
import { renderPrimitive } from "./render";
import type { PrimitiveComponent, TriggerProps } from "./types";

export function createTrigger<Steps extends readonly Step[]>(
	scope: StepperScope<Steps>,
): PrimitiveComponent<TriggerProps> {
	return function Trigger(props: TriggerProps) {
		const { render, children, ...rest } = props;
		const { store, id: instance } = scope.useValue();
		const item = scope.useStepItem();
		const id = item.data.id as Get.Id<Steps>;
		const disabled = rest.disabled || !item.canGoTo;
		const domProps = {
			type: "button" as const,
			...rest,
			id: triggerDomId(instance, id),
			"data-component": "stepper-trigger",
			"data-status": item.status,
			"data-complete": item.complete ? "" : undefined,
			role: "tab" as const,
			tabIndex: !disabled && item.isActive ? 0 : -1,
			disabled,
			"aria-disabled": disabled,
			"aria-controls": panelDomId(instance, id),
			"aria-current": item.isActive ? ("step" as const) : undefined,
			"aria-posinset": item.index + 1,
			"aria-setsize": item.count,
			"aria-selected": item.isActive,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) =>
				runClick(e, rest.onClick, () => void store.getSnapshot().goTo(id)),
		};
		return renderPrimitive("button", domProps, render, children);
	};
}

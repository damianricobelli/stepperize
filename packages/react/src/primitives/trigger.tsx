import type { Get, Step } from "@stepperize/core";
import React from "react";
import { warn } from "../dev";
import { panelDomId, type StepperScope, triggerDomId } from "./context";
import { runClick } from "./nav";
import { primitive, renderPrimitive, useDevRef } from "./render";
import type { PrimitiveComponent, TriggerProps } from "./types";

export function createTrigger<Steps extends readonly Step[]>(
	scope: StepperScope<Steps>,
): PrimitiveComponent<TriggerProps> {
	return primitive<TriggerProps, HTMLButtonElement>("Trigger", (props, forwardedRef) => {
		const { render, children, disabled: disabledProp, ...rest } = props;
		const { store, id: instance } = scope.useValue();
		const item = scope.useStepItem();
		const id = item.data.id as Get.Id<Steps>;
		const ref = useDevRef<HTMLButtonElement>(
			"Trigger",
			render,
			forwardedRef,
			process.env.NODE_ENV !== "production"
				? (element) => {
						if (
							!(
								element.textContent?.trim() ||
								element.getAttribute("aria-label") ||
								element.getAttribute("aria-labelledby")
							)
						) {
							warn("SZ002", `Stepper.Trigger for step "${id}" has no accessible name. Render text or pass aria-label.`);
						}
						if (!element.closest('[role="tablist"]')) {
							warn(
								"SZ003",
								`Stepper.Trigger for step "${id}" is outside Stepper.List, so its tab role has no tablist.`,
							);
						}
					}
				: undefined,
		);
		// While a guard runs every step is unreachable. Disabling natively then would drop
		// focus from the clicked trigger, so only steps blocked before the guard are `disabled`.
		const pending = scope.useSelector<boolean>((s) => s.isPending);
		const reachable = React.useRef(item.canGoTo);
		if (!pending) reachable.current = item.canGoTo;
		const disabled = !!disabledProp || !reachable.current;
		const domProps = {
			type: "button" as const,
			...rest,
			ref,
			children,
			id: triggerDomId(instance, id),
			"data-component": "stepper-trigger",
			"data-status": item.status,
			"data-complete": item.complete ? "" : undefined,
			"data-disabled": disabled || pending ? "" : undefined,
			role: "tab" as const,
			// Roving tabindex: the selected tab is the single tab stop of the list.
			tabIndex: !disabled && item.isActive ? 0 : -1,
			disabled,
			"aria-disabled": disabled || pending || undefined,
			"aria-controls": panelDomId(instance, id),
			"aria-current": item.isActive ? ("step" as const) : undefined,
			"aria-posinset": item.index + 1,
			"aria-setsize": item.count,
			"aria-selected": item.isActive,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) =>
				runClick(e, rest.onClick, () => {
					if (!pending) void store.getSnapshot().goTo(id);
				}),
		};
		return renderPrimitive("button", domProps, render);
	});
}

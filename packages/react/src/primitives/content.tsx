import type { Step, StepMap } from "@stepperize/core";
import React from "react";
import { panelDomId, type StepperScope, triggerDomId } from "./context";
import { primitive, renderPrimitive, useDevRef } from "./render";
import type { ContentProps, PrimitiveComponent } from "./types";

export function createContent<Steps extends readonly Step[]>(
	map: StepMap<Steps>,
	scope: StepperScope<Steps>,
): PrimitiveComponent<ContentProps<Steps>> {
	return primitive<ContentProps<Steps>, HTMLDivElement>("Content", (props, forwardedRef) => {
		const { step, forceMount, render, children, ...rest } = props;
		const { id: instance } = scope.useValue();
		const { tabs } = React.useContext(scope.UiContext);
		const active = scope.useSelector<boolean>((s) => s.id === step);
		// A hidden panel renders nothing, so there is no element to check.
		const ref = useDevRef("Content", active || forceMount ? render : undefined, forwardedRef);
		if (!active && !forceMount) return null;
		// A tabpanel is named by its tab. Without triggers it is a group named by the step title.
		const title = (map.get(step) as { title?: unknown } | undefined)?.title;
		const domProps = {
			id: panelDomId(instance, step),
			"data-component": "stepper-content",
			"data-state": active ? "active" : "inactive",
			role: tabs ? ("tabpanel" as const) : ("group" as const),
			"aria-labelledby": tabs ? triggerDomId(instance, step) : undefined,
			"aria-label": !tabs && typeof title === "string" ? title : undefined,
			// Inactive panels stay mounted (form state survives) but hidden.
			hidden: !active || undefined,
			tabIndex: active ? 0 : -1,
			...rest,
			ref,
			children,
		};
		return renderPrimitive("div", domProps, render);
	});
}

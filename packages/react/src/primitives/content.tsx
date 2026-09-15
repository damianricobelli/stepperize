import type { Step } from "@stepperize/core";
import type { StepperScope } from "./context";
import { panelDomId, triggerDomId } from "./context";
import { renderPrimitive } from "./render";
import type { ContentProps, PrimitiveComponent } from "./types";

export function createContent<Steps extends readonly Step[]>(
	scope: StepperScope<Steps>,
): PrimitiveComponent<ContentProps<Steps>> {
	return function Content(props: ContentProps<Steps>) {
		const { step, forceMount, render, children, ...rest } = props;
		const { id: instance } = scope.useValue();
		const active = scope.useSelector<boolean>((s) => s.id === step);
		if (!active && !forceMount) return null;
		const domProps = {
			id: panelDomId(instance, step),
			"data-component": "stepper-content",
			"data-state": active ? "active" : "inactive",
			role: "tabpanel" as const,
			"aria-labelledby": triggerDomId(instance, step),
			// Inactive panels stay mounted (form state survives) but hidden.
			hidden: !active || undefined,
			tabIndex: active ? 0 : -1,
			...rest,
		};
		return renderPrimitive("div", domProps, render, children);
	};
}

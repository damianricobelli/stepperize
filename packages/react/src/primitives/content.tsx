import { fail, type Step } from "@stepperize/core";
import type { Scope } from "../definition";
import { element, panelId, primitive, triggerId, useDevRef, useUi } from "./shared";
import type { Component, ContentProps } from "./types";

export function createContent<S extends readonly Step[]>(scope: Scope<S>): Component<ContentProps<S>> {
	return primitive<ContentProps<S>, HTMLDivElement>("Content", (props, forwardedRef) => {
		const { step, forceMount, render, children, ...rest } = props;
		const ui = useUi();
		const active = scope.useSelect(scope.useShared(), (s) => s.current.id === step);
		// A hidden panel renders nothing, so there is no element to check.
		const ref = useDevRef("Content", active || forceMount ? render : undefined, forwardedRef);
		// A typo would otherwise render nothing, forever: no step is ever current under an unknown id.
		const found = scope.steps[scope.positions.get(step) ?? -1] ?? fail("SZ102", `Step "${step}" not found.`);
		if (!active && !forceMount) return null;
		// A tabpanel is named by its tab. A group is named by the step title, which needs no trigger.
		const title = (found as { title?: unknown }).title;
		const named = !ui.tabs && typeof title === "string";
		const domProps = {
			id: panelId(ui, step),
			"data-component": "stepper-content",
			"data-step": step,
			role: ui.tabs ? ("tabpanel" as const) : ("group" as const),
			"aria-label": named ? title : undefined,
			"aria-labelledby": named ? undefined : triggerId(ui, step),
			// Inactive panels stay mounted (form state survives) but hidden.
			hidden: !active || undefined,
			// Tab panels are a tab stop; groups only receive focus programmatically.
			tabIndex: active && ui.tabs ? 0 : -1,
			...rest,
			ref,
			children,
		};
		return element("div", domProps, render);
	});
}

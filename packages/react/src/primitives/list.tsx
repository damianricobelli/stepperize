import type { Get, Step } from "@stepperize/core";
import React from "react";
import type { StepperScope } from "./context";
import { primitive, renderPrimitive, useDevRef } from "./render";
import type { ListProps, PrimitiveComponent } from "./types";

// Key -> index delta per orientation; Home/End jump to the edges.
const KEYS: Record<string, [horizontal: number, vertical: number]> = {
	ArrowRight: [1, 0],
	ArrowLeft: [-1, 0],
	ArrowDown: [0, 1],
	ArrowUp: [0, -1],
};

export function createList<Steps extends readonly Step[]>(scope: StepperScope<Steps>): PrimitiveComponent<ListProps> {
	return primitive<ListProps, HTMLOListElement>("List", (props, forwardedRef) => {
		const ui = React.useContext(scope.UiContext);
		const { orientation = ui.orientation, render, children, onKeyDown, ...rest } = props;
		// Read the stepper lazily in the handler so List never re-renders on navigation.
		const { store, id: instance } = scope.useValue();
		const ref = useDevRef("List", render, forwardedRef);

		const handleKeyDown = (e: React.KeyboardEvent<HTMLOListElement>) => {
			onKeyDown?.(e);
			const target = e.target as HTMLElement;
			if (e.defaultPrevented || target.getAttribute?.("role") !== "tab") return;
			const horizontal = orientation === "horizontal";
			let delta = KEYS[e.key]?.[horizontal ? 0 : 1];
			if (!delta && e.key !== "Home" && e.key !== "End") return;
			// Only this instance's tabs, in DOM order: nested lists stay correct.
			const triggers = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')).filter((tab) =>
				tab.id.startsWith(instance),
			);
			const from = triggers.indexOf(target);
			if (from === -1) return;
			// Left and right swap in right-to-left layouts.
			if (delta && horizontal && getComputedStyle(e.currentTarget).direction === "rtl") delta = -delta;
			const last = triggers.length - 1;
			const to = e.key === "Home" ? 0 : e.key === "End" ? last : Math.min(last, Math.max(0, from + (delta ?? 0)));
			e.preventDefault();
			if (to === from) return;
			const tab = triggers[to];
			const stepper = store.getSnapshot();
			const id = stepper.steps[Number(tab.getAttribute("aria-posinset")) - 1]?.id as Get.Id<Steps> | undefined;
			if (id === undefined || !stepper.canGoTo(id)) return;
			if (id === stepper.id) return tab.focus();
			void stepper.goTo(id).then((result) => {
				if (result.accepted) tab.focus();
			});
		};

		const domProps = {
			"data-component": "stepper-list",
			"data-orientation": orientation,
			role: ui.tabs ? ("tablist" as const) : undefined,
			"aria-orientation": ui.tabs ? orientation : undefined,
			...rest,
			ref,
			children,
			onKeyDown: handleKeyDown,
		};
		return (
			<scope.ListContext.Provider value={ui.tabs}>{renderPrimitive("ol", domProps, render)}</scope.ListContext.Provider>
		);
	});
}

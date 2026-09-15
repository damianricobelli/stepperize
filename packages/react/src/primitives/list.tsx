import type { Get, Step } from "@stepperize/core";
import React from "react";
import type { StepperScope } from "./context";
import { triggerDomId } from "./context";
import { renderPrimitive } from "./render";
import type { ListProps, PrimitiveComponent } from "./types";

// Key -> index delta per orientation; Home/End jump to the edges.
const KEYS: Record<string, [horizontal: number, vertical: number]> = {
	ArrowRight: [1, 0],
	ArrowLeft: [-1, 0],
	ArrowDown: [0, 1],
	ArrowUp: [0, -1],
};

export function createList<Steps extends readonly Step[]>(scope: StepperScope<Steps>): PrimitiveComponent<ListProps> {
	return function List(props: ListProps) {
		const inheritedOrientation = React.useContext(scope.OrientationContext);
		const { orientation = inheritedOrientation, render, children, onKeyDown, ...rest } = props;
		// Read the stepper lazily in the handler so List never re-renders on navigation.
		const { store, id: instance } = scope.useValue();

		const handleKeyDown = (e: React.KeyboardEvent<HTMLOListElement>) => {
			onKeyDown?.(e);
			if (e.defaultPrevented || (e.target as HTMLElement).getAttribute?.("role") !== "tab") return;
			const stepper = store.getSnapshot();
			const last = stepper.steps.length - 1;
			const delta = KEYS[e.key]?.[orientation === "horizontal" ? 0 : 1];
			const to =
				e.key === "Home" ? 0 : e.key === "End" ? last : delta ? Math.min(last, Math.max(0, stepper.index + delta)) : -1;
			if (to === -1) return;
			e.preventDefault();
			if (to === stepper.index) return;
			const id = stepper.steps[to].id as Get.Id<Steps>;
			if (!stepper.canGoTo(id)) return;
			void stepper.goTo(id).then((result) => {
				if (result.accepted) document.getElementById(triggerDomId(instance, id))?.focus();
			});
		};

		const domProps = {
			"data-component": "stepper-list",
			"data-orientation": orientation,
			role: "tablist" as const,
			"aria-orientation": orientation,
			...rest,
			onKeyDown: handleKeyDown,
		};
		return renderPrimitive("ol", domProps, render, children);
	};
}

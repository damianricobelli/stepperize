import type { Id, Step, StepState } from "@stepperize/core";
import { fail } from "@stepperize/core";
import React from "react";
import type { Scope } from "../definition";
import { element, IndexContext, ItemContext, primitive, useDevRef, useUi } from "./shared";
import type { Component, ItemProps, ItemValue, ListProps } from "./types";

// Key -> index delta per orientation; Home/End jump to the edges.
const KEYS: Record<string, [horizontal: number, vertical: number]> = {
	ArrowRight: [1, 0],
	ArrowLeft: [-1, 0],
	ArrowDown: [0, 1],
	ArrowUp: [0, -1],
};

/** `true` inside a tablist: its items are presentational. */
const TablistContext = React.createContext(false);

export function createList<S extends readonly Step[]>(scope: Scope<S>): Component<ListProps<S>> {
	return primitive<ListProps<S>, HTMLOListElement>("List", (props, forwardedRef) => {
		const ui = useUi();
		const { orientation = ui.orientation, render, children, onKeyDown, ...rest } = props;
		// Read the flow lazily in the handler so List never re-renders on navigation.
		const flow = scope.useShared();
		const ref = useDevRef("List", render, forwardedRef);

		const handleKeyDown = (e: React.KeyboardEvent<HTMLOListElement>) => {
			onKeyDown?.(e);
			const target = e.target as HTMLElement;
			if (e.defaultPrevented || target.getAttribute?.("role") !== "tab") return;
			const horizontal = orientation === "horizontal";
			let delta = KEYS[e.key]?.[horizontal ? 0 : 1];
			if (!delta && e.key !== "Home" && e.key !== "End") return;
			// Only this instance's tabs, in DOM order: nested lists stay correct.
			const tabs = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')).filter((tab) =>
				tab.id.startsWith(ui.id),
			);
			const from = tabs.indexOf(target);
			if (from === -1) return;
			// Left and right swap in right-to-left layouts.
			if (delta && horizontal && getComputedStyle(e.currentTarget).direction === "rtl") delta = -delta;
			const last = tabs.length - 1;
			const tab =
				tabs[e.key === "Home" ? 0 : e.key === "End" ? last : Math.min(last, Math.max(0, from + (delta ?? 0)))];
			e.preventDefault();
			const id = tab.dataset.step as Id<S>;
			if (tab === target || !flow.canGoTo(id)) return;
			void flow.goTo(id).then((result) => {
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
			onKeyDown: handleKeyDown,
			children:
				typeof children === "function"
					? scope.steps.map((step, index) => (
							<IndexContext.Provider key={step.id} value={index}>
								{children(step, index)}
							</IndexContext.Provider>
						))
					: children,
		};
		return <TablistContext.Provider value={ui.tabs}>{element("ol", domProps, render)}</TablistContext.Provider>;
	});
}

const STATES: StepState[] = ["pending", "complete", "current"];

export function createItem<S extends readonly Step[]>(scope: Scope<S>): Component<ItemProps<S>> {
	return primitive<ItemProps<S>, HTMLLIElement>("Item", (props, forwardedRef) => {
		const { step: id, render, children, ...rest } = props;
		const inTablist = React.useContext(TablistContext);
		const auto = React.useContext(IndexContext);
		const flow = scope.useShared();
		const ref = useDevRef("Item", render, forwardedRef);
		const index = id === undefined ? auto : (scope.positions.get(id) ?? -1);
		const step = scope.steps[index] as S[number] | undefined;
		if (!step) {
			fail(
				id === undefined ? "SZ101" : "SZ102",
				id === undefined
					? "Stepper.Item needs a `step` prop outside a Stepper.List function."
					: `Step "${id}" not found.`,
			);
		}

		// One subscription per item, its trigger included, packed into a number so `Object.is`
		// is the equality check: bits 0-1 state, 2 reachable, 3 invalid, 4 a move is running.
		const bits = scope.useSelect(
			flow,
			(s) =>
				STATES.indexOf(s.state(step.id)) |
				(s.canGoTo(step.id) ? 4 : 0) |
				(s.issues(step.id) ? 8 : 0) |
				(s.isPending ? 16 : 0),
		);
		const value = React.useMemo<ItemValue>(
			() => ({
				step,
				index,
				state: STATES[bits & 3],
				invalid: !!(bits & 8),
				disabled: !(bits & 4),
				pending: !!(bits & 16),
			}),
			[step, index, bits],
		);

		const domProps = {
			"data-component": "stepper-item",
			"data-step": step.id,
			"data-state": value.state,
			"data-invalid": value.invalid ? "" : undefined,
			"data-disabled": value.disabled ? "" : undefined,
			// A tablist owns its tabs directly: the <li> must not expose a listitem in between.
			role: inTablist ? ("presentation" as const) : undefined,
			...rest,
			ref,
			children,
		};
		return <ItemContext.Provider value={value}>{element("li", domProps, render)}</ItemContext.Provider>;
	});
}

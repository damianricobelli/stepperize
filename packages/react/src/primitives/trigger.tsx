import type { Id, Step } from "@stepperize/core";
import { warn } from "@stepperize/core";
import { reportError } from "@stepperize/core/primitives";
import React from "react";
import type { Scope } from "../definition";
import { element, panelId, primitive, triggerId, useDevRef, useItem, useUi } from "./shared";
import type { Component, PrimitiveProps } from "./types";

export function createTrigger<S extends readonly Step[]>(scope: Scope<S>): Component<PrimitiveProps<"button">> {
	return primitive<PrimitiveProps<"button">, HTMLButtonElement>("Trigger", (props, forwardedRef) => {
		const { render, children, disabled: disabledProp, onClick, ...rest } = props;
		const ui = useUi();
		// Read lazily in the handler: the item above already subscribes for this step.
		const flow = scope.useShared();
		const item = useItem<S>();
		const id = item.step.id as Id<S>;
		const current = item.state === "current";
		const ref = useDevRef<HTMLButtonElement>(
			"Trigger",
			render,
			forwardedRef,
			process.env.NODE_ENV !== "production"
				? (node) => {
						if (
							!(node.textContent?.trim() || node.getAttribute("aria-label") || node.getAttribute("aria-labelledby"))
						) {
							warn("SZ002", `Stepper.Trigger for step "${id}" has no accessible name. Render text or pass aria-label.`);
						}
						if (!node.closest('[data-component="stepper-list"]')) {
							warn("SZ003", `Stepper.Trigger for step "${id}" is outside Stepper.List.`);
						}
						// A button, or a link that goes somewhere: what the keyboard can press.
						if (!(node.tagName === "BUTTON" || (node.tagName === "A" && node.hasAttribute("href")))) {
							warn(
								"SZ005",
								`The trigger for step "${id}" is a <${node.tagName.toLowerCase()}>, not a <button>: Enter and Space do not press it and it cannot be disabled. Use a <button>.`,
							);
						}
					}
				: undefined,
		);
		// While a move runs every step is unreachable. Disabling natively then would drop
		// focus from the clicked trigger, so only steps blocked before the move are `disabled`.
		const pending = item.pending;
		const blocked = React.useRef(item.disabled);
		if (!pending) blocked.current = item.disabled;
		const disabled = !!disabledProp || blocked.current;

		const domProps = {
			type: "button" as const,
			...rest,
			ref,
			children,
			id: triggerId(ui, id),
			"data-component": "stepper-trigger",
			"data-step": id,
			"data-state": item.state,
			"data-invalid": item.invalid ? "" : undefined,
			"data-disabled": disabled || pending ? "" : undefined,
			disabled,
			"aria-disabled": disabled || pending || undefined,
			...(ui.tabs
				? {
						role: "tab" as const,
						// Roving tabindex: the selected tab is the single tab stop of the list.
						tabIndex: current && !disabled ? 0 : -1,
						"aria-selected": current,
						"aria-controls": panelId(ui, id),
						"aria-posinset": item.index + 1,
						"aria-setsize": scope.steps.length,
					}
				: { "aria-current": current ? ("step" as const) : undefined }),
			onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);
				if (!e.defaultPrevented && !pending) flow.goTo(id).catch(reportError);
			},
		};
		return element("button", domProps, render);
	});
}

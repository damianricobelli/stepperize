import type { Step } from "@stepperize/core";
import { reportError } from "@stepperize/core/primitives";
import React from "react";
import type { Scope } from "../definition";
import { element, ItemContext, primitive, useDevRef, useItem } from "./shared";
import type { Component, PrimitiveProps } from "./types";

type SpanProps = PrimitiveProps<"span">;

/** `Title` and `Description`: a `span` showing the same-named field of the step, unless you pass children. */
export function createText(field: "title" | "description"): Component<SpanProps> {
	const name = field === "title" ? "Title" : "Description";
	return primitive<SpanProps>(name, ({ render, children, ...rest }, forwardedRef) => {
		const item = React.useContext(ItemContext);
		const ref = useDevRef(name, render, forwardedRef);
		const fallback = (item?.step as Record<string, React.ReactNode> | undefined)?.[field];
		return element(
			"span",
			{ "data-component": `stepper-${field}`, ...rest, ref, children: children ?? fallback },
			render,
		);
	});
}

/** A decorative mark for the step: hidden from assistive technology, styled through `data-state`. */
export const Indicator = primitive<SpanProps>("Indicator", ({ render, ...rest }, forwardedRef) => {
	const item = useItem();
	const ref = useDevRef("Indicator", render, forwardedRef);
	const domProps = {
		"data-component": "stepper-indicator",
		"data-state": item.state,
		"data-invalid": item.invalid ? "" : undefined,
		"aria-hidden": true,
		...rest,
		ref,
	};
	return element("span", domProps, render);
});

/**
 * `Next` validates the current step and moves on; on the last step it finishes the
 * flow (`onFinish`) once. `Prev` goes back to the step you came from.
 */
export function createNav<S extends readonly Step[]>(
	dir: "next" | "prev",
	scope: Scope<S>,
): Component<PrimitiveProps<"button">> {
	const name = dir === "next" ? "Next" : "Prev";
	return primitive<PrimitiveProps<"button">, HTMLButtonElement>(name, (props, forwardedRef) => {
		const { render, children, onClick, ...rest } = props;
		const flow = scope.useShared();
		const ref = useDevRef(name, render, forwardedRef);
		// bit 0: there is somewhere to go; bit 1: a move is running; bit 2: the flow finished, so `next()` has nothing to do.
		const bits = scope.useSelect(
			flow,
			(s) =>
				(dir === "next" || s.index > 0 || s.snapshot().history.length ? 1 : 0) |
				(s.isPending ? 2 : 0) |
				(dir === "next" && s.isFinished ? 4 : 0),
		);
		const pending = !!(bits & 2);
		const idle = bits > 1;
		// The edge disables natively. A running move or a finished flow does not: the clicked button keeps focus,
		// so a rejected move never drops the keyboard user on <body>.
		const disabled = !!rest.disabled || !(bits & 1);
		const domProps = {
			type: "button" as const,
			...rest,
			ref,
			children,
			"data-component": `stepper-${dir}`,
			"data-pending": pending ? "" : undefined,
			"data-disabled": disabled || idle ? "" : undefined,
			disabled,
			"aria-disabled": disabled || idle || undefined,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) => {
				onClick?.(e);
				// Nothing awaits a click: a move that throws (a guard, a schema, a rejecting `onFinish`) is
				// reported like an error in any event listener. The flow is idle again, so the button works.
				if (!e.defaultPrevented && !idle) flow[dir]().catch(reportError);
			},
		};
		return element("button", domProps, render);
	});
}

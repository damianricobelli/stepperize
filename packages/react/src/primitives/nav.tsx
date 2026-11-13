import type { Step } from "@stepperize/core";
import type React from "react";
import type { StepperScope } from "./context";
import { primitive, renderPrimitive, useDevRef } from "./render";
import type { NextProps, PrimitiveComponent } from "./types";

export function runClick(
	e: React.MouseEvent<HTMLButtonElement>,
	onClick: React.MouseEventHandler<HTMLButtonElement> | undefined,
	action: () => void,
) {
	onClick?.(e);
	if (!e.defaultPrevented) action();
}

/** `Stepper.Next` / `Stepper.Prev`: one packed subscription (edge + pending). */
export function createNav<Steps extends readonly Step[]>(
	dir: "next" | "prev",
	scope: StepperScope<Steps>,
): PrimitiveComponent<NextProps> {
	const name = dir === "next" ? "Next" : "Prev";
	return primitive<NextProps, HTMLButtonElement>(name, (props, forwardedRef) => {
		const { render, children, ...rest } = props;
		const { store } = scope.useValue();
		const ref = useDevRef(name, render, forwardedRef);
		// bit 0: a step exists in this direction; bit 1: a guard is running.
		const bits = scope.useSelector<number>(
			(s) => ((dir === "next" ? s.index < s.count - 1 : s.index > 0) ? 1 : 0) | (s.isPending ? 2 : 0),
		);
		const pending = !!(bits & 2);
		// The edge disables natively. A pending guard does not: the clicked button keeps focus,
		// so a rejected transition never drops the keyboard user on <body>.
		const disabled = !!rest.disabled || !(bits & 1);
		const domProps = {
			...rest,
			ref,
			children,
			"data-component": `stepper-${dir}`,
			"data-pending": pending ? "" : undefined,
			"data-disabled": disabled || pending ? "" : undefined,
			type: "button" as const,
			disabled,
			"aria-disabled": disabled || pending || undefined,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) =>
				runClick(e, rest.onClick, () => {
					if (!pending) void store.getSnapshot()[dir]();
				}),
		};
		return renderPrimitive("button", domProps, render);
	});
}

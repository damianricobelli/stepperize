import type { Step } from "@stepperize/core";
import type React from "react";
import type { StepperScope } from "./context";
import { renderPrimitive } from "./render";
import type { NextProps, PrimitiveComponent } from "./types";

export function runClick(
	e: React.MouseEvent<HTMLButtonElement>,
	onClick: React.MouseEventHandler<HTMLButtonElement> | undefined,
	action: () => void,
) {
	onClick?.(e);
	if (!e.defaultPrevented) action();
}

/** `Stepper.Next` / `Stepper.Prev`: subscribe to `canNext`/`canPrev` only. */
export function createNav<Steps extends readonly Step[]>(
	dir: "next" | "prev",
	scope: StepperScope<Steps>,
): PrimitiveComponent<NextProps> {
	const can = dir === "next" ? "canNext" : "canPrev";
	return function Nav(props: NextProps) {
		const { render, children, ...rest } = props;
		const { store } = scope.useValue();
		const enabled = scope.useSelector<boolean>((s) => s[can]);
		const disabled = rest.disabled || !enabled;
		const domProps = {
			...rest,
			"data-component": `stepper-${dir}`,
			type: "button" as const,
			disabled,
			"aria-disabled": disabled,
			onClick: (e: React.MouseEvent<HTMLButtonElement>) =>
				runClick(e, rest.onClick, () => void store.getSnapshot()[dir]()),
		};
		return renderPrimitive("button", domProps, render, children);
	};
}

import * as React from "react";
import type { Step } from "@stepperize/core";
import type { IndicatorProps } from "./types";
import { useStepItemContext } from "./context";

export function createIndicator<Steps extends Step[]>() {
	return function Indicator(props: IndicatorProps) {
		const { render, children, ...rest } = props;
		const item = useStepItemContext();
		const merged = {
			"data-component": "stepper-indicator",
			"data-status": item.status,
			...rest,
		};
		const content = render ? render(merged as React.ComponentPropsWithoutRef<"span">) : children;
		return React.createElement("span", { "aria-hidden": true, ...merged }, content);
	};
}

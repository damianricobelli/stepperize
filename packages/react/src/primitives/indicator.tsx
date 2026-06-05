import type React from "react";
import { useStepItemContext } from "./context";
import type { IndicatorProps, PrimitiveComponent } from "./types";

export function createIndicator(): PrimitiveComponent<IndicatorProps> {
	return function Indicator(props: IndicatorProps) {
		const { render, children, ...rest } = props;
		const item = useStepItemContext();
		const domProps = {
			"data-component": "stepper-indicator",
			"data-status": item.status,
			"aria-hidden": true,
			...rest,
		};
		if (render) return render(domProps as React.ComponentPropsWithoutRef<"span">);
		return <span {...domProps}>{children}</span>;
	};
}

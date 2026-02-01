import * as React from "react";
import type { SeparatorProps } from "./types";

export function createSeparator() {
	return function Separator(props: SeparatorProps) {
		const { orientation, "data-status": dataStatus, render, children, ...rest } = props;
		const domProps = {
			"data-component": "stepper-separator",
			"data-orientation": orientation,
			"data-status": dataStatus,
			tabIndex: -1,
			...rest,
		};
		if (render) return render(domProps)
		return React.createElement("hr", domProps, children);
	};
}

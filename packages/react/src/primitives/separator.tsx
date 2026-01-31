import * as React from "react";
import type { SeparatorProps } from "./types";

export function createSeparator() {
	return function Separator(props: SeparatorProps) {
		const { orientation, "data-status": dataStatus, render, children, ...rest } = props;
		const merged = {
			"data-component": "stepper-separator",
			"data-orientation": orientation,
			"data-status": dataStatus,
			tabIndex: -1,
			...rest,
		};
		const content = render ? render(merged as React.ComponentPropsWithoutRef<"hr">) : children;
		return React.createElement("hr", merged, content);
	};
}

import * as React from "react";
import type { ActionsProps } from "./types";

export function createActions() {
	return function Actions(props: ActionsProps) {
		const { render, children, ...rest } = props;
		const domProps = {
			"data-component": "stepper-actions",
			...rest,
		};
		if (render) return render(domProps)
		return React.createElement("div", domProps, children);
	};
}

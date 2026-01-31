import * as React from "react";
import type { ActionsProps } from "./types";

export function createActions() {
	return function Actions(props: ActionsProps) {
		const { render, children, ...rest } = props;
		const merged = {
			"data-component": "stepper-actions",
			...rest,
		};
		const content = render ? render(merged as React.ComponentPropsWithoutRef<"div">) : children;
		return React.createElement("div", merged, content);
	};
}

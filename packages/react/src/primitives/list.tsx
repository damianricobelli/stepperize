import * as React from "react";
import type { ListProps } from "./types";

export function createList() {
	return function List(props: ListProps) {
		const { orientation, render, children, ...rest } = props;
		const merged = {
			"data-component": "stepper-list",
			"data-orientation": orientation,
			...rest,
		};
		const content = render ? render(merged as React.ComponentPropsWithoutRef<"ol">) : children;
		return React.createElement("ol", merged, content);
	};
}

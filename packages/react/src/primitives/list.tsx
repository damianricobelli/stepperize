import * as React from "react";
import type { ListProps } from "./types";

export function createList() {
	return function List(props: ListProps) {
		const { orientation, render, children, ...rest } = props;
		const domProps = {
			"data-component": "stepper-list",
			"data-orientation": orientation,
			...rest,
		};
		if (render) return render(domProps)
		return React.createElement("ol", domProps, children);
	};
}

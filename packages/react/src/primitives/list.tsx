import * as React from "react";
import type { Step } from "@stepperize/core";
import type { ListProps } from "./types";

export function createList<Steps extends Step[]>() {
	return function List(props: ListProps<Steps>) {
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

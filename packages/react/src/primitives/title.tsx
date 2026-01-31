import * as React from "react";
import type { TitleProps } from "./types";

export function createTitle() {
	return function Title(props: TitleProps) {
		const { render, children, ...rest } = props;
		const merged = {
			"data-component": "stepper-title",
			...rest,
		};
		const content = render ? render(merged as React.ComponentPropsWithoutRef<"h4">) : children;
		return React.createElement("h4", merged, content);
	};
}

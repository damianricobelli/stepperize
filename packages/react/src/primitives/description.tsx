import * as React from "react";
import type { Step } from "@stepperize/core";
import type { DescriptionProps } from "./types";

export function createDescription<Steps extends Step[]>() {
	return function Description(props: DescriptionProps) {
		const { render, children, ...rest } = props;
		const domProps = {
			"data-component": "stepper-description",
			...rest,
		};
		if (render) return render(domProps)
		return React.createElement("p", domProps, children);
	};
}

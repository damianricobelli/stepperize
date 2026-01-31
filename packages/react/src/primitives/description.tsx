import * as React from "react";
import type { Step } from "@stepperize/core";
import type { DescriptionProps } from "./types";

export function createDescription<Steps extends Step[]>() {
	return function Description(props: DescriptionProps) {
		const { render, children, ...rest } = props;
		const merged = {
			"data-component": "stepper-description",
			...rest,
		};
		const content = render ? render(merged as React.ComponentPropsWithoutRef<"p">) : children;
		return React.createElement("p", merged, content);
	};
}

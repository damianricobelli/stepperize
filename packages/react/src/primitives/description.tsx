import type React from "react";
import { useOptionalStepItemContext } from "./context";
import type { DescriptionProps, PrimitiveComponent } from "./types";

export function createDescription(): PrimitiveComponent<DescriptionProps> {
	return function Description(props: DescriptionProps) {
		const { render, children, ...rest } = props;
		const item = useOptionalStepItemContext();
		const description =
			children ?? (item?.data && "description" in item.data ? (item.data.description as React.ReactNode) : undefined);
		const domProps = {
			"data-component": "stepper-description",
			...rest,
		};
		if (render) return render(domProps);
		return <p {...domProps}>{description}</p>;
	};
}

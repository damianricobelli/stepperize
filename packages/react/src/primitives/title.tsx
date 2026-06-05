import type React from "react";
import { useOptionalStepItemContext } from "./context";
import type { PrimitiveComponent, TitleProps } from "./types";

export function createTitle(): PrimitiveComponent<TitleProps> {
	return function Title(props: TitleProps) {
		const { render, children, ...rest } = props;
		const item = useOptionalStepItemContext();
		const title = children ?? (item?.data && "title" in item.data ? (item.data.title as React.ReactNode) : undefined);
		const domProps = {
			"data-component": "stepper-title",
			...rest,
		};
		if (render) return render(domProps);
		return <h4 {...domProps}>{title}</h4>;
	};
}

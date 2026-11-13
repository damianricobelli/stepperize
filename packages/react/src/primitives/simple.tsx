import type React from "react";
import { useContext } from "react";
import { fail } from "../dev";
import type { StepItemValue, UiValue } from "./context";
import { primitive, renderPrimitive, useDevRef } from "./render";
import type { PrimitiveComponent, PrimitiveProps, SeparatorProps } from "./types";

type Extra = (item: StepItemValue | null, children: React.ReactNode) => Record<string, unknown>;

/** Factory for leaf primitives: a tag, a `data-component`, and optional item-derived props. */
export function createSimple<E extends keyof React.JSX.IntrinsicElements>(
	name: string,
	tag: E,
	extra: Extra | undefined,
	requireItem: boolean,
	ItemContext: React.Context<StepItemValue | null>,
): PrimitiveComponent<PrimitiveProps<E>> {
	const label = name[0].toUpperCase() + name.slice(1);
	return primitive<PrimitiveProps<E>>(label, (props, forwardedRef) => {
		const { render, children, ...rest } = props as PrimitiveProps<"div">;
		const item = useContext(ItemContext);
		const ref = useDevRef(label, render, forwardedRef);
		if (requireItem && !item) fail("SZ101", `Missing Stepper.Item. Render Stepper.${label} inside a Stepper.Item.`);
		const domProps: Record<string, unknown> = {
			"data-component": `stepper-${name}`,
			children,
			...extra?.(item, children),
			...rest,
			ref,
		};
		return renderPrimitive(tag, domProps, render as never);
	});
}

/** Text primitives fall back to the same-named field on the step. */
export const fromStep =
	(field: string): Extra =>
	(item, children) => ({
		children: children ?? (item?.data as Record<string, unknown> | undefined)?.[field],
	});

export const withStatus: Extra = (item) => ({
	"data-status": item?.status,
	"data-complete": item?.complete ? "" : undefined,
	"aria-hidden": true,
});

/** `hr` with orientation/status passthrough as data attributes. */
export function createSeparator(UiContext: React.Context<UiValue>) {
	return primitive<SeparatorProps, HTMLHRElement>("Separator", (props, forwardedRef) => {
		const ui = useContext(UiContext);
		const { orientation = ui.orientation, render, children: _c, ...rest } = props;
		const ref = useDevRef("Separator", render, forwardedRef);
		const domProps = {
			"data-component": "stepper-separator",
			"data-orientation": orientation,
			"aria-hidden": true,
			tabIndex: -1,
			...rest,
			ref,
		};
		return renderPrimitive("hr", domProps, render);
	});
}

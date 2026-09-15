import type React from "react";
import type { RenderProp } from "./types";

/** Keep render-prop passthrough and default element rendering consistent. */
export function renderPrimitive<E extends keyof React.JSX.IntrinsicElements>(
	tag: E,
	props: React.ComponentPropsWithoutRef<E>,
	render: RenderProp<E> | undefined,
	children?: React.ReactNode,
) {
	if (render) return render(props);
	const Tag = tag as React.ElementType;
	return <Tag {...props}>{children}</Tag>;
}

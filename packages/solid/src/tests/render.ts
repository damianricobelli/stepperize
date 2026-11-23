import type { JSX } from "solid-js";
import { render as mount } from "solid-js/web";

const mounted: (() => void)[] = [];

/** Render into a fresh container. `cleanup` disposes everything rendered so far. */
export function render(ui: () => JSX.Element) {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const dispose = mount(ui, container);
	const unmount = () => {
		dispose();
		container.remove();
	};
	mounted.push(unmount);
	return { container, unmount };
}

export function cleanup() {
	for (const unmount of mounted.splice(0)) unmount();
}

/** Let promises and Solid's effects settle. */
export const settle = () => new Promise<void>((resolve) => setTimeout(resolve));

// Lit's hydration support must load before Lit itself: the elements are imported only once the server output is in the page.
import "@lit-labs/ssr-client/lit-element-hydrate-support.js";
import { expect, it, vi } from "vitest";
import { commands, page as screen, userEvent } from "vitest/browser";
import type { Served } from "./elements";

declare module "vitest/browser" {
	interface BrowserCommands {
		renderOnServer: () => Promise<string>;
	}
}

it("server output shows the right panel before any script runs, and hydration adds the rest in place", async () => {
	const container = document.createElement("div");
	document.body.appendChild(container);
	container.setHTMLUnsafe(await commands.renderOnServer());
	const host = container.querySelector("sz-served") as Served;
	const dom = host.shadowRoot as ShadowRoot;
	const panels = Array.from(dom.querySelectorAll("section"));
	const buttons = Array.from(dom.querySelectorAll("button"));

	// Before hydration: what the template wrote as bindings, and nothing the directives add.
	expect(panels.map((panel) => panel.hidden)).toEqual([false, true, true]);
	expect(buttons.map((button) => button.type)).toEqual(["button", "button", "button", "button", "button"]);
	expect(Array.from(dom.querySelectorAll("li"), (item) => item.dataset.state)).toEqual([
		"current",
		"pending",
		"pending",
	]);
	expect(dom.querySelector("[role], [data-component]")).toBeNull();

	const errors = vi.spyOn(console, "error");
	const warnings = vi.spyOn(console, "warn");
	await import("./elements");
	await host.updateComplete;
	await host.updateComplete;

	// Hydrated in place: the same elements, now with roles, ids and state.
	expect(Array.from(dom.querySelectorAll("section"))).toEqual(panels);
	expect(dom.querySelector("ol")?.getAttribute("role")).toBe("tablist");
	expect(panels.map((panel) => [panel.getAttribute("role"), panel.hidden])).toEqual([
		["tabpanel", false],
		["tabpanel", true],
		["tabpanel", true],
	]);
	const tab = screen.getByRole("tab", { name: "First" }).element();
	expect(dom.getElementById(tab.getAttribute("aria-controls") ?? "")).toBe(panels[0]);

	await userEvent.click(screen.getByRole("button", { name: "Continue" }));
	await host.updateComplete;
	expect(panels.map((panel) => panel.hidden)).toEqual([true, false, true]);
	expect(Array.from(dom.querySelectorAll("li"), (item) => item.dataset.state)).toEqual([
		"complete",
		"current",
		"pending",
	]);
	expect((buttons[3] as HTMLButtonElement).disabled).toBe(false);
	expect(errors).not.toHaveBeenCalled();
	expect(warnings.mock.calls.filter((call) => !String(call[0]).includes("dev mode"))).toEqual([]);
	container.remove();
});

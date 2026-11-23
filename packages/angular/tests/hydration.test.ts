import { type ApplicationRef, destroyPlatform, type Type } from "@angular/core";
import contract from "@angular/core/event-dispatch-contract.min.js?raw";
import { bootstrapApplication, provideClientHydration } from "@angular/platform-browser";
import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Deferred, Pair } from "./fixtures";
import { renderOnServer } from "./render-on-server";

let cleanup: (() => void)[] = [];
afterEach(() => {
	for (const step of cleanup.reverse()) step();
	cleanup = [];
	vi.restoreAllMocks();
});

/**
 * Render on the server, then put the HTML in this page as the browser would have parsed it, scripts
 * included. Angular's server renderer has no Node dependencies, so it runs right here, with the server
 * platform, before the browser platform hydrates the result.
 */
async function serve(component: Type<unknown>, selector: string, options: { replay?: boolean } = {}) {
	destroyPlatform();
	const html = await renderOnServer(component, selector, options.replay ? contract : undefined);
	destroyPlatform();
	const page = new DOMParser().parseFromString(html, "text/html");
	// Angular looks for its marker comment directly in <body>.
	const served = Array.from(page.body.childNodes, (node) => document.importNode(node, true));
	document.body.prepend(...served);
	cleanup.push(() => {
		for (const node of served) node.parentNode?.removeChild(node);
	});
	// Parsed scripts never run: run the early event contract and its bootstrap call as the page would.
	for (const parsed of page.querySelectorAll<HTMLScriptElement>("script:not([type='application/json'])")) {
		const script = document.createElement("script");
		script.textContent = parsed.textContent;
		document.head.append(script);
		cleanup.push(() => script.remove());
	}
	return document.body.querySelector(selector) as HTMLElement;
}

async function hydrate(component: Type<unknown>): Promise<ApplicationRef> {
	const app = await bootstrapApplication(component, { providers: [provideClientHydration()] });
	cleanup.push(() => app.destroy());
	await app.whenStable();
	return app;
}

/** Every attribute of every element, minus Angular's own hydration bookkeeping. */
const attributes = (host: Element) =>
	Array.from(host.querySelectorAll("*:not([aria-live])"), (node) =>
		Array.from(node.attributes, (attribute) => `${attribute.name}=${attribute.value}`)
			.filter((attribute) => !attribute.startsWith("ngh=") && !attribute.startsWith("ng-server-context="))
			.join(" "),
	);

it("keeps the server HTML: hydration adopts the same elements and nothing changes until the user acts", async () => {
	const host = await serve(Pair, "sz-pair");
	expect(host.querySelectorAll('[role="tablist"]').length).toBe(2);
	const ids = Array.from(host.querySelectorAll("[id]"), (node) => node.id);
	expect(ids.length).toBe(12);
	expect(new Set(ids).size).toBe(ids.length);
	const before = { attributes: attributes(host), nodes: Array.from(host.querySelectorAll("*")) };
	const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const app = await hydrate(Pair);
	expect(warnings).not.toHaveBeenCalled();
	expect(errors).not.toHaveBeenCalled();
	// The same elements, untouched: hydration adopted them instead of rendering again.
	const after = Array.from(host.querySelectorAll("*:not([aria-live])"));
	expect(after.length).toBe(before.nodes.length);
	expect(after.every((node, index) => node === before.nodes[index])).toBe(true);
	expect(attributes(host)).toEqual(before.attributes);
	// The live regions arrive now, one per stepper.
	expect(host.querySelectorAll('[aria-live="polite"]').length).toBe(2);
	// Hydrated, not inert.
	await userEvent.click(host.querySelectorAll<HTMLElement>('[data-component="stepper-next"]')[1]);
	await app.whenStable();
	expect(host.querySelectorAll('[aria-selected="true"]')[1]?.textContent).toContain("Second");
});

it("replays a click that happened before hydration", async () => {
	const host = await serve(Pair, "sz-pair", { replay: true });
	const next = host.querySelectorAll<HTMLElement>('[data-component="stepper-next"]')[1];
	// Nothing is listening yet but the early event contract, which records the click.
	next.click();
	expect(host.querySelectorAll('[aria-selected="true"]')[1]?.textContent).toContain("First");
	const app = await hydrate(Pair);
	await new Promise((resolve) => setTimeout(resolve));
	await app.whenStable();
	expect(host.querySelectorAll('[aria-selected="true"]')[1]?.textContent).toContain("Second");
});

it("keeps the tablist while its triggers wait in a block that is not hydrated", async () => {
	const host = await serve(Deferred, "sz-deferred");
	expect(host.querySelector("ol")?.getAttribute("role")).toBe("tablist");
	expect(host.querySelectorAll('[role="tab"]').length).toBe(3);
	const before = attributes(host);
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const app = await hydrate(Deferred);
	expect(errors).not.toHaveBeenCalled();
	// The tabs are still the server's, so the list and the panels still belong to tabs.
	expect(attributes(host)).toEqual(before);
	await userEvent.click(host.querySelector<HTMLElement>('[data-component="stepper-next"]') as HTMLElement);
	await app.whenStable();
	const panels = Array.from(host.querySelectorAll<HTMLElement>('[data-component="stepper-content"]'));
	expect(panels.map((panel) => [panel.getAttribute("role"), panel.hidden])).toEqual([
		["tabpanel", true],
		["tabpanel", false],
		["tabpanel", true],
	]);
});

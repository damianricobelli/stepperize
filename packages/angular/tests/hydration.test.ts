import { destroyPlatform } from "@angular/core";
import { bootstrapApplication, provideClientHydration } from "@angular/platform-browser";
import { expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { Pair } from "./fixtures";
import { renderPair } from "./render-on-server";

it("keeps the server HTML: hydration adopts the same elements and nothing changes until the user acts", async () => {
	// Angular's server renderer has no Node dependencies, so the page is rendered right here,
	// with the server platform, before the browser platform hydrates it.
	destroyPlatform();
	const html = await renderPair();
	destroyPlatform();
	const page = new DOMParser().parseFromString(html, "text/html");
	// As the browser would have parsed it: Angular looks for its marker comment directly in <body>.
	const served = Array.from(page.body.childNodes, (node) => document.importNode(node, true));
	document.body.prepend(...served);
	const host = document.body.querySelector("sz-pair") as HTMLElement;
	expect(host.querySelectorAll('[role="tablist"]').length).toBe(2);
	const ids = Array.from(host.querySelectorAll("[id]"), (node) => node.id);
	expect(ids.length).toBe(12);
	expect(new Set(ids).size).toBe(ids.length);
	const attributes = () =>
		Array.from(host.querySelectorAll("*:not([aria-live])"), (node) =>
			Array.from(node.attributes, (attribute) => `${attribute.name}=${attribute.value}`)
				// Angular's own hydration bookkeeping, removed once an element is claimed.
				.filter((attribute) => !attribute.startsWith("ngh=") && !attribute.startsWith("ng-server-context="))
				.join(" "),
		);
	const before = { attributes: attributes(), nodes: Array.from(host.querySelectorAll("*")) };
	const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const app = await bootstrapApplication(Pair, { providers: [provideClientHydration()] });
	await app.whenStable();
	expect(warnings).not.toHaveBeenCalled();
	expect(errors).not.toHaveBeenCalled();
	// The same elements, untouched: hydration adopted them instead of rendering again.
	const after = Array.from(host.querySelectorAll("*:not([aria-live])"));
	expect(after.length).toBe(before.nodes.length);
	expect(after.every((node, index) => node === before.nodes[index])).toBe(true);
	expect(attributes()).toEqual(before.attributes);
	// The live regions arrive now, one per stepper.
	expect(host.querySelectorAll('[aria-live="polite"]').length).toBe(2);
	// Hydrated, not inert.
	await userEvent.click(host.querySelectorAll<HTMLElement>('[data-component="stepper-next"]')[1]);
	await app.whenStable();
	expect(host.querySelectorAll('[aria-selected="true"]')[1]?.textContent).toContain("Second");
	app.destroy();
	for (const node of served) node.parentNode?.removeChild(node);
	warnings.mockRestore();
	errors.mockRestore();
});

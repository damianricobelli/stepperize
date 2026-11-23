// @vitest-environment node
import { render } from "@lit-labs/ssr";
import { collectResultSync } from "@lit-labs/ssr/lib/render-result.js";
import { html } from "lit";
import { expect, it, vi } from "vitest";

it("renders on the server without browser globals or callbacks; the parts are applied on the client", async () => {
	const onChange = vi.fn();
	const onInvalidStep = vi.fn();
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const { Full } = await import("./elements");
	expect(customElements.get("sz-full")).toBe(Full);
	const page = collectResultSync(
		render(
			html`<sz-full .options=${{ snapshot: { step: "second" }, step: "nope", onChange, onInvalidStep }}></sz-full>`,
		),
	);
	// Declarative shadow DOM, with the template's own content in it.
	expect(page).toContain('<template shadowroot="open"');
	expect(page).toMatch(/<label>.*Second.* name <input/s);
	// Element directives do not run in Lit's server renderer, so roles and ids arrive with hydration.
	expect(page).not.toContain('role="tablist"');
	expect(errors).not.toHaveBeenCalled();
	expect(onChange).not.toHaveBeenCalled();
	expect(onInvalidStep).not.toHaveBeenCalled();
	errors.mockRestore();
});

it("what the first paint needs is written as bindings, which the server renders", async () => {
	await import("./elements");
	const page = collectResultSync(
		render(html`<sz-served .options=${{ snapshot: { step: "second", complete: ["first"] } }}></sz-served>`),
	);
	const panels = Array.from(page.matchAll(/<section([^>]*)>/g), (match) => match[1].includes("hidden"));
	expect(panels).toEqual([true, false, true]);
	expect(Array.from(page.matchAll(/data-state="(\w+)"/g), (match) => match[1])).toEqual([
		"complete",
		"current",
		"pending",
	]);
	expect(page.match(/<button type="button"/g)?.length).toBe(5);
	// The directives' own attributes are added by hydration.
	expect(page).not.toContain("data-component");
});

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

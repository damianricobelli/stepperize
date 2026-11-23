// @vitest-environment node
import { render } from "svelte/server";
import { expect, it, vi } from "vitest";
import Scenario from "./fixtures/Scenario.svelte";

it("renders the stepper and the primitives on the server without browser globals or callbacks", () => {
	const onChange = vi.fn();
	const onInvalidStep = vi.fn();
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
	const { body } = render(Scenario, {
		props: {
			name: "server",
			options: {
				local: { snapshot: { step: "second" }, step: "nope", onChange, onInvalidStep },
				root: { onChange },
			},
		},
	});
	expect(body).toContain("<span>second</span>");
	expect(body).toContain('role="tablist"');
	expect(body).toContain('role="tabpanel"');
	expect(body).toContain("First form");
	expect(body).toContain('aria-selected="true"');
	expect(errors).not.toHaveBeenCalled();
	expect(warnings).not.toHaveBeenCalled();
	expect(onChange).not.toHaveBeenCalled();
	expect(onInvalidStep).not.toHaveBeenCalled();
	errors.mockRestore();
	warnings.mockRestore();
});

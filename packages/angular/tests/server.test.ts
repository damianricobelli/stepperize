// @vitest-environment node
import { Component } from "@angular/core";
import { defineStepper, STEPPER_PRIMITIVES } from "@stepperize/angular";
import { expect, it, vi } from "vitest";
import { renderOnServer } from "./render-on-server";

it("renders the stepper and the primitives on the server without browser globals or callbacks", async () => {
	const onChange = vi.fn();
	const onInvalidStep = vi.fn();
	const flow = defineStepper([
		{ id: "cart", title: "Cart" },
		{ id: "review", title: "Review" },
	]);

	@Component({
		selector: "sz-page",
		imports: [STEPPER_PRIMITIVES],
		template: `
			<span>{{ local().current.id }}</span>
			<div [stepperRoot]="stepper">
				<ol stepperList>
					@for (step of stepper.steps; track step.id) {
						<li [stepperItem]="step.id"><button stepperTrigger>{{ step.title }}</button></li>
					}
				</ol>
				<div stepperContent="cart">Cart form</div>
				<div stepperContent="review">Review form</div>
				<button stepperNext>Continue</button>
			</div>
		`,
	})
	class Page {
		readonly local = flow.injectStepper({ snapshot: { step: "review" }, step: "nope", onChange, onInvalidStep });
		readonly stepper = flow.injectStepper({ onChange });
	}

	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const html = await renderOnServer(Page, "sz-page");
	expect(html).toContain("<span>review</span>");
	// Unlike a client-only check, the server already knows which triggers exist: the roles are in the HTML.
	expect(html).toContain('role="tablist"');
	expect(html).toContain('role="tabpanel"');
	expect(html).toContain('aria-selected="true"');
	expect(html).toMatch(/<div[^>]*data-step="review"[^>]*hidden=""[^>]*>Review form<\/div>/);
	expect(html).toMatch(/<div[^>]*data-step="cart"[^>]*>Cart form<\/div>/);
	expect(html).not.toMatch(/data-step="cart"[^>]*hidden/);
	// The live region is added in the browser, after hydration.
	expect(html).not.toContain("aria-live");
	expect(errors).not.toHaveBeenCalled();
	expect(onChange).not.toHaveBeenCalled();
	expect(onInvalidStep).not.toHaveBeenCalled();
	errors.mockRestore();
});

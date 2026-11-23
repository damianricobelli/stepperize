// @vitest-environment node
import { Component, effect, signal } from "@angular/core";
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

it("applies options on the server, and children of the root read its stepper", async () => {
	const flow = defineStepper([
		{ id: "cart", title: "Cart" },
		{ id: "review", title: "Review" },
	]);

	@Component({ selector: "sz-current", template: "<em>{{ stepper().current.id }}</em>" })
	class Current {
		readonly stepper = flow.injectStepperContext();
	}

	@Component({
		selector: "sz-page",
		imports: [STEPPER_PRIMITIVES, Current],
		template: `
			<div [stepperRoot]="stepper">
				<sz-current />
				<ol stepperList>
					@for (step of stepper.steps; track step.id) {
						<li [stepperItem]="step.id"><button stepperTrigger>{{ step.title }}</button></li>
					}
				</ol>
			</div>
		`,
	})
	class Page {
		readonly linear = signal(false);
		readonly stepper = flow.injectStepper(() => ({ linear: this.linear() }));
		constructor() {
			// Changed after the flow exists: the server renders it anyway.
			effect(() => {
				this.stepper();
				this.linear.set(true);
			});
		}
	}

	const html = await renderOnServer(Page, "sz-page");
	expect(html).toContain("<em>cart</em>");
	expect(html).not.toContain('role="tablist"');
	expect(html).toMatch(/<button[^>]*data-step="review"[^>]*disabled=""/);
});

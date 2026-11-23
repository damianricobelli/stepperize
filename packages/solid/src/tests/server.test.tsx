// @vitest-environment node
import { renderToString } from "solid-js/web";
import { expect, it, vi } from "vitest";
import { defineStepper } from "../index";

it("renders the stepper and the primitives on the server without browser globals or callbacks", () => {
	const onChange = vi.fn();
	const onInvalidStep = vi.fn();
	const flow = defineStepper([
		{ id: "cart", title: "Cart" },
		{ id: "review", title: "Review" },
	]);
	function Local() {
		const stepper = flow.useStepper({ snapshot: { step: "review" }, step: "nope", onChange, onInvalidStep });
		return <span>{stepper.current.id}</span>;
	}
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
	const html = renderToString(() => (
		<>
			<Local />
			<flow.Stepper.Root onChange={onChange}>
				<flow.Stepper.List>
					{() => (
						<flow.Stepper.Item>
							<flow.Stepper.Trigger>
								<flow.Stepper.Title />
							</flow.Stepper.Trigger>
						</flow.Stepper.Item>
					)}
				</flow.Stepper.List>
				<flow.Stepper.Content step="cart">Cart form</flow.Stepper.Content>
				<flow.Stepper.Next>Continue</flow.Stepper.Next>
			</flow.Stepper.Root>
		</>
	));
	expect(html).toMatch(/<span[^>]*>review<\/span>/);
	expect(html).toContain('role="tablist"');
	expect(html).toContain('role="tabpanel"');
	expect(html).toContain("Cart form");
	expect(html).toContain('aria-selected="true"');
	expect(errors).not.toHaveBeenCalled();
	expect(warnings).not.toHaveBeenCalled();
	expect(onChange).not.toHaveBeenCalled();
	expect(onInvalidStep).not.toHaveBeenCalled();
	errors.mockRestore();
	warnings.mockRestore();
});

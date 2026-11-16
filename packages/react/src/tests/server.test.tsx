// @vitest-environment node
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { defineStepper } from "../index";

it("renders hooks and primitives on the server without browser globals or callbacks", () => {
	const onChange = vi.fn();
	const flow = defineStepper([
		{ id: "cart", title: "Cart" },
		{ id: "review", title: "Review" },
	]);
	function Local() {
		return <span>{flow.useStepper({ snapshot: { step: "review" }, onChange }).current.id}</span>;
	}
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const html = renderToString(
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
		</>,
	);
	expect(html).toContain("<span>review</span>");
	expect(html).toContain('role="tablist"');
	expect(html).toContain('role="tabpanel"');
	expect(html).toContain("Cart form");
	expect(errors).not.toHaveBeenCalled();
	expect(onChange).not.toHaveBeenCalled();
	errors.mockRestore();
});

// @vitest-environment node
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { defineStepper } from "../define-stepper";

it("renders local and shared instances without browser globals or server callbacks", () => {
	const flow = defineStepper([{ id: "cart" }, { id: "review" }], {
		defaultStep: "review",
		defaultCompleted: ["cart"],
		defaultData: { cart: "draft" },
	});
	const invalid = vi.fn();
	const guard = vi.fn();
	function Local() {
		const s = flow.useStepper();
		return (
			<span>
				{s.id}:{String(s.data.get("cart"))}:{String(s.isComplete("cart"))}
			</span>
		);
	}
	function Shared() {
		const s = flow.useStepperContext();
		return (
			<span>
				{s.id}:{String(s.isComplete("cart"))}
			</span>
		);
	}
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	try {
		const html = renderToString(
			<>
				<Local />
				<flow.Provider step="unknown" onInvalidStep={invalid} beforeStepChange={guard}>
					<Shared />
				</flow.Provider>
			</>,
		);
		expect(html).toContain("review");
		expect(html).toContain("draft");
		expect(html).toContain("true");
		expect(invalid).not.toHaveBeenCalled();
		expect(guard).not.toHaveBeenCalled();
		expect(errors).not.toHaveBeenCalled();
	} finally {
		errors.mockRestore();
	}
});

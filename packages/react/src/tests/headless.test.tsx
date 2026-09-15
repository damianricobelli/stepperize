import { afterEach, expect, it } from "vitest";
import { page as screen } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { defineStepper } from "../headless";
import { defineStepper as defineFull } from "../index";
import { act } from "./act";

afterEach(cleanup);

it("shares typed state through its Provider while local and nested full flows remain independent", async () => {
	const flow = defineStepper([{ id: "cart" }, { id: "review" }]);
	const full = defineFull([{ id: "first" }, { id: "last" }]);
	let shared!: ReturnType<typeof flow.useStepper>;
	function Read() {
		shared = flow.useStepperContext();
		const id = flow.useStepperContext((s) => s.id);
		const local = flow.useStepper();
		return (
			<span data-testid="state">
				{id}:{local.id}:{String(shared.isComplete("cart"))}:{String(shared.data.get("cart"))}
			</span>
		);
	}
	await render(
		<flow.Provider>
			<full.Stepper.Root>
				<Read />
				<full.Stepper.Next>Next</full.Stepper.Next>
			</full.Stepper.Root>
		</flow.Provider>,
	);
	await act(async () => {
		expect(await shared.next({ data: "draft", complete: true })).toEqual({
			accepted: true,
			from: "cart",
			to: "review",
		});
	});
	expect(screen.getByTestId("state").element().textContent).toBe("review:cart:true:draft");
	await act(async () => {
		await shared.reset();
	});
	expect(screen.getByTestId("state").element().textContent).toBe("cart:cart:false:undefined");
	expect(flow).not.toHaveProperty("Stepper");
});

import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { defineStepper } from "../define-stepper";
import { act } from "./act";

const flow = defineStepper([
	{ id: "cart", title: "Cart" },
	{ id: "review", title: "Review" },
]);
function Probe() {
	const snapshot = flow.useStepperContext((s) => ({
		id: s.id,
		data: s.data.get("cart"),
		complete: s.isComplete("cart"),
	}));
	return <output>{JSON.stringify(snapshot)}</output>;
}
function Instance({ controlled }: { controlled: boolean }) {
	const state = controlled
		? { step: "review", data: { cart: "controlled" }, completed: ["cart" as const] }
		: { defaultStep: "review" as const, defaultData: { cart: "initial" }, defaultCompleted: ["cart" as const] };
	return (
		<flow.Stepper.Root {...state}>
			<Probe />
			<flow.Stepper.List>
				<flow.Stepper.Items>
					{(step) => (
						<flow.Stepper.Item>
							<flow.Stepper.Trigger>{step.title}</flow.Stepper.Trigger>
						</flow.Stepper.Item>
					)}
				</flow.Stepper.Items>
			</flow.Stepper.List>
			<flow.Stepper.Content step="cart" forceMount>
				Cart content
			</flow.Stepper.Content>
			<flow.Stepper.Content step="review" forceMount>
				Review content
			</flow.Stepper.Content>
		</flow.Stepper.Root>
	);
}
it.each([false, true])("hydrates initial state and unique linked IDs (controlled: %s)", async (controlled) => {
	const ui = (
		<>
			<Instance controlled={controlled} />
			<Instance controlled={controlled} />
		</>
	);
	const container = document.createElement("div");
	container.innerHTML = renderToString(ui);
	document.body.appendChild(container);
	const original = container.innerHTML;
	const originalNodes = Array.from(container.querySelectorAll("[id]"));
	const ids = originalNodes.map((node) => node.id);
	expect(new Set(ids).size).toBe(ids.length);
	expect(container.querySelector("output")?.textContent).toBe(
		JSON.stringify({ id: "review", data: controlled ? "controlled" : "initial", complete: true }),
	);
	expect(container.querySelector('[data-state="inactive"]')?.hasAttribute("hidden")).toBe(true);
	for (const tab of container.querySelectorAll('[role="tab"]')) {
		const panel = document.getElementById(tab.getAttribute("aria-controls") ?? "");
		expect(panel?.getAttribute("aria-labelledby")).toBe(tab.id);
	}
	const recoverable = vi.fn();
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	let root!: ReturnType<typeof hydrateRoot>;
	try {
		await act(async () => {
			root = hydrateRoot(container, ui, { onRecoverableError: recoverable });
		});
		expect(recoverable).not.toHaveBeenCalled();
		expect(container.innerHTML).toBe(original);
		Array.from(container.querySelectorAll("[id]")).forEach((node, index) => {
			expect(node).toBe(originalNodes[index]);
		});
		expect(errors).not.toHaveBeenCalled();
		// The second flow advances independently after hydration; relationships remain unique.
		const firstTabs = container.querySelectorAll('[role="tab"]');
		await act(async () => {
			(firstTabs[2] as HTMLButtonElement).click();
		});
		expect(container.querySelectorAll("output")[0].textContent).toContain('"id":"review"');
		expect(container.querySelectorAll("output")[1].textContent).toContain(controlled ? '"id":"review"' : '"id":"cart"');
	} finally {
		if (root) await act(async () => await root.unmount());
		container.remove();
		errors.mockRestore();
	}
});

it("hydrates a local flow and updates it after hydration", async () => {
	function Local() {
		const state = flow.useStepper({ defaultData: { cart: "draft" } });
		return (
			<button
				type="button"
				onClick={() => {
					void state.next();
				}}
			>
				{state.id}:{String(state.data.get("cart"))}
			</button>
		);
	}
	const container = document.createElement("div");
	container.innerHTML = renderToString(<Local />);
	const original = container.firstChild;
	const recoverable = vi.fn();
	let root!: ReturnType<typeof hydrateRoot>;
	try {
		await act(async () => {
			root = hydrateRoot(container, <Local />, { onRecoverableError: recoverable });
		});
		expect(container.firstChild).toBe(original);
		expect(container.textContent).toBe("cart:draft");
		await act(async () => {
			container.querySelector("button")?.click();
		});
		expect(container.textContent).toBe("review:draft");
		expect(recoverable).not.toHaveBeenCalled();
	} finally {
		if (root) await act(async () => await root.unmount());
	}
});

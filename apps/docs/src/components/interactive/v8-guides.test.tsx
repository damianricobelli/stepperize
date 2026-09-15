import { afterEach, expect, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { act } from "./act";
import { ControlledDemo } from "./controlled-demo";
import { LifecycleViz } from "./lifecycle-viz";
import { OwnershipDemo } from "./ownership-demo";
import { PolicyDemo } from "./policy-demo";
import { ResetDemo } from "./reset-demo";
import { SelectorsDemo } from "./selectors-demo";

afterEach(async () => {
	await cleanup();
	vi.useRealTimers();
});

async function click(button: HTMLElement | SVGElement) {
	await userEvent.click(button);
}

it("stages navigation data, rejects invalid drafts, then commits data and source completion together", async () => {
	vi.useFakeTimers();
	const ui = await render(<LifecycleViz />);
	const committed = () =>
		JSON.parse(
			ui.getByRole("region", { name: "Committed state" }).element()
				.textContent ?? "{}",
		);
	await userEvent.fill(ui.getByLabelText("Draft name"), "A");
	await click(ui.getByRole("button", { name: "Save and continue" }).element());
	expect(committed()).toEqual({
		data: { details: "Original draft" },
		completed: [],
	});
	await act(async () => {
		await vi.advanceTimersByTimeAsync(800);
	});
	expect(
		ui.getByRole("status", { name: "Navigation result" }).element().textContent,
	).toContain('"reason":"guard"');
	expect(committed().data.details).toBe("Original draft");
	await userEvent.fill(ui.getByLabelText("Draft name"), "Grace");
	await click(ui.getByRole("button", { name: "Save and continue" }).element());
	await click(
		ui.getByRole("button", { name: "Try duplicate request" }).element(),
	);
	expect(ui.getByRole("log").element().textContent).toContain(
		'"reason":"pending"',
	);
	await act(async () => {
		await vi.advanceTimersByTimeAsync(800);
	});
	expect(committed()).toEqual({
		data: { details: "Grace" },
		completed: ["details"],
	});
	expect(
		ui.getByRole("status", { name: "Navigation result" }).element().textContent,
	).toContain('"to":"review"');
});

it("rejects a valid draft when the guard switch is enabled and cancels stale work after an external edit", async () => {
	vi.useFakeTimers();
	const ui = await render(<LifecycleViz />);
	await click(ui.getByLabelText("Reject in guard").element());
	await click(ui.getByRole("button", { name: "Save and continue" }).element());
	await act(async () => {
		await vi.advanceTimersByTimeAsync(800);
	});
	expect(
		ui.getByRole("status", { name: "Navigation result" }).element().textContent,
	).toContain('"reason":"guard"');
	await click(ui.getByLabelText("Reject in guard").element());
	await click(ui.getByRole("button", { name: "Save and continue" }).element());
	await click(
		ui.getByRole("button", { name: "Write data while pending" }).element(),
	);
	await act(async () => {
		await vi.advanceTimersByTimeAsync(1000);
	});
	expect(
		ui.getByRole("status", { name: "Navigation result" }).element().textContent,
	).toContain('"reason":"cancelled"');
	expect(
		JSON.parse(
			ui.getByRole("region", { name: "Committed state" }).element()
				.textContent ?? "{}",
		),
	).toEqual({ data: { details: "External edit" }, completed: [] });
	expect(
		ui.getByText("Current: details · Pending: false").element(),
	).toBeTruthy();
	await click(ui.getByRole("button", { name: "Reset demo" }).element());
	expect(
		ui.getByRole("region", { name: "Committed state" }).element().textContent,
	).toContain("Original draft");
});

it("cleans up simulated validation when its owner unmounts", async () => {
	vi.useFakeTimers();
	const ui = await render(<LifecycleViz />);
	await click(ui.getByRole("button", { name: "Save and continue" }).element());
	await ui.unmount();
	await act(async () => {
		await Promise.resolve();
	});
	expect(vi.getTimerCount()).toBe(0);
});

it.each([
	["Reset everything", "Initial draft", []],
	["Keep data", "Edited draft", []],
	["Keep completion", "Initial draft", ["details"]],
	["Keep both", "Edited draft", ["details"]],
])(
	"%s restores only the selected defaults",
	async (button, draft, completed) => {
		const ui = await render(<ResetDemo />);
		await userEvent.fill(ui.getByLabelText("Saved draft"), "Edited draft");
		await click(
			ui
				.getByRole("button", { name: "Complete details and advance" })
				.element(),
		);
		await click(ui.getByRole("button", { name: String(button) }).element());
		expect(
			JSON.parse(
				ui.getByRole("region", { name: "Before reset" }).element()
					.textContent ?? "{}",
			),
		).toEqual({
			step: "review",
			data: { details: "Edited draft" },
			completed: ["details"],
		});
		expect(
			JSON.parse(
				ui.getByRole("region", { name: "After reset" }).element().textContent ??
					"{}",
			),
		).toEqual({ step: "details", data: { details: draft }, completed });
	},
);

it("distinguishes accepted controlled requests from prop updates and external guard bypass", async () => {
	const ui = await render(<ControlledDemo />);
	await click(ui.getByLabelText("Apply onStepChange requests").element());
	await click(ui.getByRole("button", { name: "Next" }).element());
	expect(ui.getByText("Rendered step: details").element()).toBeTruthy();
	expect(ui.getByText("Last requested step: review").element()).toBeTruthy();
	expect(ui.getByRole("status").element().textContent).toContain(
		'"accepted":true',
	);
	await click(ui.getByLabelText("Guard allows navigation").element());
	await click(ui.getByRole("button", { name: "Next" }).element());
	expect(ui.getByRole("status").element().textContent).toContain(
		'"reason":"guard"',
	);
	await ui.getByRole("combobox", { name: /External step/ }).selectOptions("done");
	expect(ui.getByText("Rendered step: done").element()).toBeTruthy();
	await click(ui.getByRole("button", { name: "Reset demo" }).element());
	await click(ui.getByRole("button", { name: "Next" }).element());
	expect(ui.getByText("Rendered step: review").element()).toBeTruthy();
});

it("bypasses linear policy without bypassing the guard", async () => {
	const ui = await render(<PolicyDemo />);
	await click(ui.getByRole("button", { name: "Go to review" }).element());
	expect(
		ui.getByRole("status", { name: "Policy result" }).element().textContent,
	).toContain('"reason":"policy"');
	expect(ui.getByText("Guard calls: 0").element()).toBeTruthy();
	await click(ui.getByLabelText("Guard allows navigation").element());
	await click(ui.getByRole("button", { name: "Bypass policy" }).element());
	expect(
		ui.getByRole("status", { name: "Policy result" }).element().textContent,
	).toContain('"reason":"guard"');
	expect(ui.getByText("Guard calls: 1").element()).toBeTruthy();
	await click(ui.getByLabelText("Guard allows navigation").element());
	await click(ui.getByRole("button", { name: "Bypass policy" }).element());
	expect(
		ui.getByRole("status", { name: "Policy result" }).element().textContent,
	).toContain('"to":"review"');
});

it("updates only the selected values for each selector card", async () => {
	const ui = await render(<SelectorsDemo />);
	const step = page.elementLocator(
		ui.getByRole("region", { name: "Step subscriber" }).element(),
	);
	const data = page.elementLocator(
		ui.getByRole("region", { name: "Data subscriber" }).element(),
	);
	const completion = page.elementLocator(
		ui.getByRole("region", { name: "Completion subscriber" }).element(),
	);
	const stepNode = step.getByText("details").element();
	const completionNode = completion.getByText("Incomplete").element();
	await userEvent.fill(ui.getByLabelText("Name in details"), "Grace");
	expect(data.getByText("Grace").element()).toBeTruthy();
	expect(step.getByText("details").element()).toBe(stepNode);
	expect(completion.getByText("Incomplete").element()).toBe(completionNode);
	await click(ui.getByRole("button", { name: "Next" }).element());
	expect(step.getByText("review").element()).toBeTruthy();
	expect(data.getByText("Grace").element()).toBeTruthy();
	await click(
		ui.getByRole("button", { name: "Toggle details completion" }).element(),
	);
	expect(completion.getByText("Complete").element()).toBeTruthy();
});

it("isolates a local hook inside a provider and resets a nested provider to its own default", async () => {
	const ui = await render(<OwnershipDemo />);
	const outer = page.elementLocator(
		ui.getByRole("region", { name: "Shared checkout" }).element(),
	);
	const local = page.elementLocator(
		ui
			.getByRole("region", { name: "Local checkout inside Provider" })
			.element(),
	);
	const nested = page.elementLocator(
		ui.getByRole("region", { name: "Nested shared checkout" }).element(),
	);
	await click(nested.getByRole("button", { name: "Next" }).element());
	expect(nested.getByText("Step 3 of 3").element()).toBeTruthy();
	expect(outer.getByText("Step 1 of 3").element()).toBeTruthy();
	await click(local.getByRole("button", { name: "Next" }).element());
	expect(local.getByText("Payment").element()).toBeTruthy();
	expect(outer.getByText("Step 1 of 3").element()).toBeTruthy();
	await click(nested.getByRole("button", { name: "Reset" }).element());
	expect(nested.getByText("Step 2 of 3").element()).toBeTruthy();
	await click(outer.getByRole("button", { name: "Next" }).element());
	await click(outer.getByRole("button", { name: "Next" }).element());
	expect(outer.getByText("Step 3 of 3").element()).toBeTruthy();
	expect(nested.getByText("Step 2 of 3").element()).toBeTruthy();
	expect(local.getByText("Payment").element()).toBeTruthy();
});

import { afterEach, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-react";
import { FrameworkDemo } from "./framework-demo";

afterEach(async () => {
	await cleanup();
});

it("runs the React demo in place: three steps, then a finished flow", async () => {
	const ui = await render(<FrameworkDemo framework="react" />);
	const demo = ui.container.querySelector('[data-demo="react"]');
	expect(demo).not.toBeNull();
	expect(
		ui.container
			.querySelector('[data-framework-demo="react"]')
			?.getAttribute("data-state"),
	).toBe("mounted");

	await expect.element(ui.getByText("Step 1 of 3")).toBeVisible();
	await expect.element(ui.getByText("Create your account.")).toBeVisible();

	await ui.getByRole("button", { name: "Continue" }).click();
	await expect.element(ui.getByText("Step 2 of 3")).toBeVisible();
	await ui.getByRole("button", { name: "Back" }).click();
	await expect.element(ui.getByText("Step 1 of 3")).toBeVisible();

	await ui.getByRole("button", { name: "Continue" }).click();
	await ui.getByRole("button", { name: "Continue" }).click();
	await expect
		.element(ui.getByText("Press Finish to complete the flow."))
		.toBeVisible();
	await ui.getByRole("button", { name: "Finish" }).click();
	await expect.element(ui.getByText("Finished. Thanks!")).toBeVisible();
});

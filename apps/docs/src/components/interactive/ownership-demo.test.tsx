import { afterEach, beforeEach, expect, it } from "vitest";
import { page, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { ConditionalOnboardingBlock } from "../blocks/conditional-onboarding";
import { SaveResumeBlock } from "../blocks/save-resume";
import { ValidatedCheckoutBlock } from "../blocks/validated-checkout";
import { OwnershipDemo } from "./ownership-demo";

let originalUrl: string;
beforeEach(() => {
	originalUrl = window.location.href;
	localStorage.removeItem("stepperize:save-resume");
});

afterEach(async () => {
	await cleanup();
	localStorage.removeItem("stepperize:save-resume");
	window.history.replaceState(null, "", originalUrl);
});

it("keeps local flows independent and shares heading, panel and controls", async () => {
	const ui = await render(<OwnershipDemo />);
	const a = page.elementLocator(
		ui.getByRole("region", { name: "Local checkout A" }).element(),
	);
	const b = page.elementLocator(
		ui.getByRole("region", { name: "Local checkout B" }).element(),
	);
	const shared = page.elementLocator(
		ui.getByRole("region", { name: "Shared checkout" }).element(),
	);
	await userEvent.click(a.getByRole("button", { name: "Next" }).element());
	expect(a.getByText("Payment").element()).toBeTruthy();
	expect(b.getByText("Shipping").element()).toBeTruthy();
	expect(shared.getByText("Step 1 of 3").element()).toBeTruthy();
	await userEvent.click(shared.getByRole("button", { name: "Next" }).element());
	expect(shared.getByText("Step 2 of 3").element()).toBeTruthy();
	expect(shared.getByText("Choose a payment method.").element()).toBeTruthy();
	await userEvent.click(
		shared.getByRole("button", { name: "Reset" }).element(),
	);
	expect(shared.getByText("Step 1 of 3").element()).toBeTruthy();
	expect(a.getByText("Payment").element()).toBeTruthy();
});

it("blocks invalid checkout data, then completes only the accepted source", async () => {
	const ui = await render(<ValidatedCheckoutBlock />);
	await userEvent.click(ui.getByRole("button", { name: "Continue" }).element());
	expect(ui.getByText("Name is required").element()).toBeTruthy();
	await userEvent.fill(ui.getByLabelText("Full name"), "Ada");
	await userEvent.fill(ui.getByLabelText("Address"), "12 Analytical Ave");
	await userEvent.fill(ui.getByLabelText("ZIP code"), "90210");
	await userEvent.click(ui.getByRole("button", { name: "Continue" }).element());
	expect(ui.getByLabelText("Card number").element()).toBeTruthy();
	expect(
		ui.container.querySelectorAll(
			'[data-component="stepper-item"][data-complete]',
		).length,
	).toBe(1);
});

it("resumes validated persisted data and preserves detail fields", async () => {
	localStorage.setItem(
		"stepperize:save-resume",
		JSON.stringify({
			step: "details",
			name: "Acme",
			industry: "Software",
			teamSize: "5",
		}),
	);
	const ui = await render(<SaveResumeBlock />);
	expect(
		(ui.getByLabelText("Industry").element() as HTMLInputElement).value,
	).toBe("Software");
	await userEvent.fill(ui.getByLabelText("Team size"), "8");
	await userEvent.click(ui.getByRole("button", { name: "Continue" }).element());
	expect(ui.getByText("Team size: 8").element()).toBeTruthy();
	expect(
		JSON.parse(localStorage.getItem("stepperize:save-resume") ?? "{}").step,
	).toBe("review");
	await userEvent.click(ui.getByRole("button", { name: "Reset" }).element());
	expect(
		(ui.getByLabelText("Workspace name").element() as HTMLInputElement).value,
	).toBe("");
});

it("recovers unknown persisted step ids instead of restoring an invalid flow", async () => {
	localStorage.setItem(
		"stepperize:save-resume",
		JSON.stringify({ step: "missing", name: { bad: true } }),
	);
	const ui = await render(<SaveResumeBlock />);
	expect(
		(ui.getByLabelText("Workspace name").element() as HTMLInputElement).value,
	).toBe("");
});

it("allows the explicit personal branch to skip team setup under linear policy", async () => {
	const ui = await render(<ConditionalOnboardingBlock />);
	await userEvent.click(ui.getByRole("button", { name: /Just me/ }).element());
	await userEvent.click(ui.getByRole("button", { name: /Continue/ }).element());
	await userEvent.click(
		ui.getByRole("button", { name: /Continue|Finish/ }).element(),
	);
	expect(
		ui.getByText("Your personal workspace is ready.").element(),
	).toBeTruthy();
});

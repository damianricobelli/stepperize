import { virtual } from "@guidepup/virtual-screen-reader";
import { afterEach, expect, it } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { defineStepper } from "../define-stepper";

// What a screen reader says, using Guidepup's virtual screen reader. It follows
// the same accessibility tree VoiceOver and NVDA read, so these phrases catch
// regressions in names, roles, states and announcements.
afterEach(async () => {
	await virtual.stop();
	await cleanup();
});

const flow = defineStepper([
	{ id: "shipping", title: "Shipping" },
	{ id: "payment", title: "Payment" },
	{ id: "review", title: "Review" },
]);
const { Stepper } = flow;

function Checkout() {
	return (
		<Stepper.Root linear aria-label="Checkout">
			<Stepper.List>
				<Stepper.Items>
					{() => (
						<Stepper.Item>
							<Stepper.Trigger>
								<Stepper.Indicator>•</Stepper.Indicator>
								<Stepper.Title />
							</Stepper.Trigger>
						</Stepper.Item>
					)}
				</Stepper.Items>
			</Stepper.List>
			{flow.steps.map((step) => (
				<Stepper.Content key={step.id} step={step.id}>
					{step.title} form
				</Stepper.Content>
			))}
			<Stepper.Prev>Back</Stepper.Prev>
			<Stepper.Next>Continue</Stepper.Next>
		</Stepper.Root>
	);
}

async function start() {
	const { container } = await render(<Checkout />);
	await virtual.start({ container });
	return screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
}

it("reads names, states and positions; skips the decorative indicator", async () => {
	await start();
	const spoken: string[] = [];
	do {
		spoken.push(await virtual.lastSpokenPhrase());
		await virtual.next();
	} while ((await virtual.lastSpokenPhrase()) !== spoken[0]);

	expect(spoken).toContain("group, Checkout");
	expect(spoken).toContain("tablist, orientated horizontally");
	expect(spoken.find((phrase) => phrase.startsWith("tab, Shipping"))).toMatch(/selected.*position 1, set size 3/);
	expect(spoken).toContain("tab, Payment, not selected, position 2, set size 3");
	// A step the policy blocks is still listed, as unavailable.
	expect(spoken).toContain("tab, Review, not selected, disabled, position 3, set size 3");
	expect(spoken).toContain("tabpanel, Shipping");
	expect(spoken).toContain("button, Back, disabled");
	expect(spoken.join(" ")).not.toContain("•");
});

it("announces the new step when Next keeps focus", async () => {
	const next = await start();
	next.focus();
	await userEvent.click(next);
	expect(document.activeElement).toBe(next);
	expect(await virtual.spokenPhraseLog()).toContain("polite: Payment");
});

it("reads the new panel, once, when focus is rescued on the last step", async () => {
	const next = await start();
	next.focus();
	await userEvent.click(next);
	await userEvent.click(next);
	const spoken = await virtual.spokenPhraseLog();
	expect(spoken.at(-1)).toBe("tabpanel, Review");
	expect(spoken).not.toContain("polite: Review");
});

it("stays quiet when a tab is activated: the tab reads itself", async () => {
	await start();
	await userEvent.click(screen.getByRole("tab", { name: "Payment" }).element());
	expect((await virtual.spokenPhraseLog()).some((phrase) => phrase.startsWith("polite"))).toBe(false);
});

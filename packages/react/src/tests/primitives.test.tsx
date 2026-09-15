import { describe, expect, it } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { defineStepper } from "../define-stepper";

const steps = [
	{ id: "first", title: "First", description: "First description" },
	{ id: "second", title: "Second", description: "Second description" },
];

const threeSteps = [
	{ id: "first", title: "First", description: "First description" },
	{ id: "second", title: "Second", description: "Second description" },
	{ id: "third", title: "Third", description: "Third description" },
];

describe("primitives", () => {
	it("Stepper.Items can render items without passing step to Item", async () => {
		const { Stepper } = defineStepper(steps);

		await render(
			<Stepper.Root>
				{({ stepper }) => (
					<Stepper.List>
						<Stepper.Items>
							{(step) => (
								<Stepper.Item
									render={(props) => (
										<li {...props}>
											<span data-testid={`status-${step.id}`}>{stepper.status(step.id)}</span>
										</li>
									)}
								/>
							)}
						</Stepper.Items>
					</Stepper.List>
				)}
			</Stepper.Root>,
		);

		expect(screen.getByTestId("status-first").element().textContent).toBe("active");
		expect(screen.getByTestId("status-second").element().textContent).toBe("upcoming");
	});

	it("Title and Description read defaults from the item step", async () => {
		const { Stepper } = defineStepper(steps);

		await render(
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Item step="first">
						<Stepper.Title />
						<Stepper.Description />
					</Stepper.Item>
				</Stepper.List>
			</Stepper.Root>,
		);

		expect(screen.getByText("First").element()).toBeTruthy();
		expect(screen.getByText("First description").element()).toBeTruthy();
	});

	it("Stepper.Trigger respects preventDefault in onClick", async () => {
		const { Stepper } = defineStepper(steps);

		await render(
			<Stepper.Root>
				{({ stepper }) => (
					<>
						<span data-testid="current">{stepper.id}</span>
						<Stepper.List>
							<Stepper.Items>
								{(step) => (
									<Stepper.Item>
										<Stepper.Trigger
											onClick={(event) => {
												if (step.id === "second") event.preventDefault();
											}}
										>
											<Stepper.Title />
										</Stepper.Trigger>
									</Stepper.Item>
								)}
							</Stepper.Items>
						</Stepper.List>
					</>
				)}
			</Stepper.Root>,
		);

		await userEvent.click(screen.getByRole("tab", { name: "Second" }).element());
		expect(screen.getByTestId("current").element().textContent).toBe("first");
	});

	it("Stepper.Trigger respects linear navigation policy", async () => {
		const { Stepper } = defineStepper(threeSteps);

		await render(
			<Stepper.Root linear>
				{({ stepper }) => (
					<>
						<span data-testid="current">{stepper.id}</span>
						<Stepper.List>
							<Stepper.Items>
								{() => (
									<Stepper.Item>
										<Stepper.Trigger>
											<Stepper.Title />
										</Stepper.Trigger>
									</Stepper.Item>
								)}
							</Stepper.Items>
						</Stepper.List>
					</>
				)}
			</Stepper.Root>,
		);

		const thirdTrigger = screen.getByRole("tab", { name: "Third" }).element();
		expect(thirdTrigger).toHaveProperty("disabled", true);

		await userEvent.click(thirdTrigger, { force: true });
		expect(screen.getByTestId("current").element().textContent).toBe("first");
	});

	it("Stepper.Next and Stepper.Prev respect preventDefault in onClick", async () => {
		const { Stepper } = defineStepper(threeSteps);

		await render(
			<Stepper.Root defaultStep="second">
				{({ stepper }) => (
					<>
						<span data-testid="current">{stepper.id}</span>
						<Stepper.Prev onClick={(event) => event.preventDefault()}>Prev</Stepper.Prev>
						<Stepper.Next onClick={(event) => event.preventDefault()}>Next</Stepper.Next>
					</>
				)}
			</Stepper.Root>,
		);

		await userEvent.click(screen.getByRole("button", { name: "Prev" }).element());
		expect(screen.getByTestId("current").element().textContent).toBe("second");

		await userEvent.click(screen.getByRole("button", { name: "Next" }).element());
		expect(screen.getByTestId("current").element().textContent).toBe("second");
	});

	it("Stepper.List respects preventDefault in onKeyDown", async () => {
		const { Stepper } = defineStepper(steps);

		await render(
			<Stepper.Root>
				{({ stepper }) => (
					<>
						<span data-testid="current">{stepper.id}</span>
						<Stepper.List onKeyDown={(event) => event.preventDefault()}>
							<Stepper.Items>
								{() => (
									<Stepper.Item>
										<Stepper.Trigger>
											<Stepper.Title />
										</Stepper.Trigger>
									</Stepper.Item>
								)}
							</Stepper.Items>
						</Stepper.List>
					</>
				)}
			</Stepper.Root>,
		);

		const firstTrigger = screen.getByRole("tab", { name: "First" }).element();
		firstTrigger.focus();
		await userEvent.keyboard("{ArrowRight}");

		expect(screen.getByTestId("current").element().textContent).toBe("first");
	});

	it("Stepper.List keeps focus in place when keyboard navigation is canceled", async () => {
		const { Stepper } = defineStepper(steps);

		await render(
			<Stepper.Root beforeStepChange={() => false}>
				<Stepper.List>
					<Stepper.Items>
						{() => (
							<Stepper.Item>
								<Stepper.Trigger>
									<Stepper.Title />
								</Stepper.Trigger>
							</Stepper.Item>
						)}
					</Stepper.Items>
				</Stepper.List>
			</Stepper.Root>,
		);

		const firstTrigger = screen.getByRole("tab", { name: "First" }).element();
		firstTrigger.focus();
		await userEvent.keyboard("{ArrowRight}");
		await Promise.resolve();

		expect(document.activeElement).toBe(firstTrigger);
	});

	it("Stepper.List keyboard navigation respects linear policy", async () => {
		const { Stepper } = defineStepper(threeSteps);

		await render(
			<Stepper.Root linear>
				{({ stepper }) => (
					<>
						<span data-testid="current">{stepper.id}</span>
						<Stepper.List>
							<Stepper.Items>
								{() => (
									<Stepper.Item>
										<Stepper.Trigger>
											<Stepper.Title />
										</Stepper.Trigger>
									</Stepper.Item>
								)}
							</Stepper.Items>
						</Stepper.List>
					</>
				)}
			</Stepper.Root>,
		);

		const firstTrigger = screen.getByRole("tab", { name: "First" }).element();
		firstTrigger.focus();

		await userEvent.keyboard("{End}");
		await Promise.resolve();
		expect(screen.getByTestId("current").element().textContent).toBe("first");
		expect(document.activeElement).toBe(firstTrigger);

		await userEvent.keyboard("{ArrowRight}");
		await Promise.resolve();
		expect(screen.getByTestId("current").element().textContent).toBe("second");

		const secondTrigger = screen.getByRole("tab", { name: "Second" }).element();
		expect(document.activeElement).toBe(secondTrigger);

		await userEvent.keyboard("{Home}");
		await Promise.resolve();
		expect(screen.getByTestId("current").element().textContent).toBe("first");
	});

	it("Stepper.Indicator render replaces the root element", async () => {
		const { Stepper } = defineStepper(steps);

		await render(
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Item step="first">
						<Stepper.Indicator render={(props) => <span {...props}>Custom</span>} />
					</Stepper.Item>
				</Stepper.List>
			</Stepper.Root>,
		);

		expect(screen.getByText("Custom").element().getAttribute("data-component")).toBe("stepper-indicator");
		expect(screen.getByText("Custom").element().querySelector("[data-component='stepper-indicator']")).toBeNull();
	});

	it("Prev and Next buttons disable at edges", async () => {
		const { Stepper } = defineStepper(steps);

		await render(
			<Stepper.Root>
				<Stepper.Prev>Back</Stepper.Prev>
				<Stepper.Next>Forward</Stepper.Next>
			</Stepper.Root>,
		);

		expect(screen.getByRole("button", { name: "Back" }).element()).toHaveProperty("disabled", true);
		expect(screen.getByRole("button", { name: "Forward" }).element()).toHaveProperty("disabled", false);
	});
});

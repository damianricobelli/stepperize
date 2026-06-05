import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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
	it("Stepper.Items can render items without passing step to Item", () => {
		const { Stepper } = defineStepper(steps);

		render(
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

		expect(screen.getByTestId("status-first").textContent).toBe("active");
		expect(screen.getByTestId("status-second").textContent).toBe("upcoming");
	});

	it("Title and Description read defaults from the item step", () => {
		const { Stepper } = defineStepper(steps);

		render(
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Item step="first">
						<Stepper.Title />
						<Stepper.Description />
					</Stepper.Item>
				</Stepper.List>
			</Stepper.Root>,
		);

		expect(screen.getByText("First")).toBeTruthy();
		expect(screen.getByText("First description")).toBeTruthy();
	});

	it("Stepper.Trigger respects preventDefault in onClick", () => {
		const { Stepper } = defineStepper(steps);

		render(
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

		fireEvent.click(screen.getByRole("tab", { name: "Second" }));
		expect(screen.getByTestId("current").textContent).toBe("first");
	});

	it("Stepper.Trigger respects linear navigation policy", () => {
		const { Stepper } = defineStepper(threeSteps);

		render(
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

		const thirdTrigger = screen.getByRole("tab", { name: "Third" });
		expect(thirdTrigger).toHaveProperty("disabled", true);

		fireEvent.click(thirdTrigger);
		expect(screen.getByTestId("current").textContent).toBe("first");
	});

	it("Stepper.Next and Stepper.Prev respect preventDefault in onClick", () => {
		const { Stepper } = defineStepper(steps);

		render(
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

		fireEvent.click(screen.getByRole("button", { name: "Prev" }));
		expect(screen.getByTestId("current").textContent).toBe("second");

		fireEvent.click(screen.getByRole("button", { name: "Next" }));
		expect(screen.getByTestId("current").textContent).toBe("second");
	});

	it("Stepper.List respects preventDefault in onKeyDown", () => {
		const { Stepper } = defineStepper(steps);

		render(
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

		const firstTrigger = screen.getByRole("tab", { name: "First" });
		firstTrigger.focus();
		fireEvent.keyDown(firstTrigger, { key: "ArrowRight" });

		expect(screen.getByTestId("current").textContent).toBe("first");
	});

	it("Stepper.List keeps focus in place when keyboard navigation is canceled", async () => {
		const { Stepper } = defineStepper(steps);

		render(
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

		const firstTrigger = screen.getByRole("tab", { name: "First" });
		firstTrigger.focus();
		fireEvent.keyDown(firstTrigger, { key: "ArrowRight" });
		await Promise.resolve();

		expect(document.activeElement).toBe(firstTrigger);
	});

	it("Stepper.List keyboard navigation respects linear policy", async () => {
		const { Stepper } = defineStepper(threeSteps);

		render(
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

		const firstTrigger = screen.getByRole("tab", { name: "First" });
		firstTrigger.focus();

		fireEvent.keyDown(firstTrigger, { key: "End" });
		await Promise.resolve();
		expect(screen.getByTestId("current").textContent).toBe("first");
		expect(document.activeElement).toBe(firstTrigger);

		fireEvent.keyDown(firstTrigger, { key: "ArrowRight" });
		await Promise.resolve();
		expect(screen.getByTestId("current").textContent).toBe("second");

		const secondTrigger = screen.getByRole("tab", { name: "Second" });
		expect(document.activeElement).toBe(secondTrigger);

		fireEvent.keyDown(secondTrigger, { key: "Home" });
		await Promise.resolve();
		expect(screen.getByTestId("current").textContent).toBe("first");
	});

	it("Stepper.Indicator render replaces the root element", () => {
		const { Stepper } = defineStepper(steps);

		render(
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Item step="first">
						<Stepper.Indicator render={(props) => <span {...props}>Custom</span>} />
					</Stepper.Item>
				</Stepper.List>
			</Stepper.Root>,
		);

		expect(screen.getByText("Custom").getAttribute("data-component")).toBe("stepper-indicator");
		expect(screen.getByText("Custom").querySelector("[data-component='stepper-indicator']")).toBeNull();
	});

	it("Prev and Next buttons disable at edges", () => {
		const { Stepper } = defineStepper(steps);

		render(
			<Stepper.Root>
				<Stepper.Prev>Back</Stepper.Prev>
				<Stepper.Next>Forward</Stepper.Next>
			</Stepper.Root>,
		);

		expect(screen.getByRole("button", { name: "Back" })).toHaveProperty("disabled", true);
		expect(screen.getByRole("button", { name: "Forward" })).toHaveProperty("disabled", false);
	});
});

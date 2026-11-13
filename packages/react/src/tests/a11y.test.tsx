import axe from "axe-core";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { cleanup, render, renderHook } from "vitest-browser-react";
import { defineStepper } from "../define-stepper";
import { defineStepper as defineHeadless } from "../headless";
import { act } from "./act";

afterEach(cleanup);

const steps = [
	{ id: "first", title: "First", description: "Start here" },
	{ id: "second", title: "Second", description: "Then this" },
	{ id: "third", title: "Third", description: "Finish" },
];
type Flow = ReturnType<typeof defineStepper<typeof steps>>;

async function violations(element: Element) {
	// `region` is about page landmarks, not a component rendered in isolation.
	const result = await axe.run(element, { rules: { region: { enabled: false } } });
	return result.violations.map(
		(violation) => `${violation.id}: ${violation.nodes.map((node) => node.html).join(" | ")}`,
	);
}

function Full({ flow, ...props }: { flow: Flow } & Partial<React.ComponentProps<Flow["Stepper"]["Root"]>>) {
	const { Stepper } = flow;
	return (
		<Stepper.Root {...props}>
			<Stepper.List>
				<Stepper.Items>
					{() => (
						<Stepper.Item>
							<Stepper.Trigger>
								<Stepper.Indicator />
								<Stepper.Title />
								<Stepper.Description />
							</Stepper.Trigger>
							<Stepper.Separator />
						</Stepper.Item>
					)}
				</Stepper.Items>
			</Stepper.List>
			{steps.map((step) => (
				<Stepper.Content key={step.id} step={step.id}>
					<label>
						{step.title} name
						<input />
					</label>
				</Stepper.Content>
			))}
			<Stepper.Actions>
				<Stepper.Prev>Back</Stepper.Prev>
				<Stepper.Next>Continue</Stepper.Next>
			</Stepper.Actions>
		</Stepper.Root>
	);
}

describe("axe", () => {
	it("has no violations in the full layout, before and after navigating", async () => {
		const flow = defineStepper(steps);
		const { container } = await render(<Full flow={flow} defaultCompleted={["first"]} linear />);
		expect(await violations(container)).toEqual([]);
		await userEvent.click(screen.getByRole("button", { name: "Continue" }).element());
		expect(await violations(container)).toEqual([]);
	});

	it("has no violations without triggers: panels are groups named by the step title", async () => {
		const { Stepper } = defineStepper(steps);
		const { container } = await render(
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Items>
						{() => (
							<Stepper.Item>
								<Stepper.Indicator />
							</Stepper.Item>
						)}
					</Stepper.Items>
				</Stepper.List>
				<Stepper.Content step="first">One</Stepper.Content>
				<Stepper.Next>Continue</Stepper.Next>
			</Stepper.Root>,
		);
		const panel = container.querySelector('[data-component="stepper-content"]');
		expect(panel?.getAttribute("role")).toBe("group");
		expect(panel?.getAttribute("aria-label")).toBe("First");
		expect(panel?.hasAttribute("aria-labelledby")).toBe(false);
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		expect(container.querySelector("li")?.hasAttribute("role")).toBe(false);
		expect(await violations(container)).toEqual([]);
	});

	it("only counts its own triggers when another stepper is nested inside", async () => {
		const outer = defineStepper(steps);
		const inner = defineStepper(steps);
		const { container } = await render(
			<outer.Stepper.Root data-testid="outer">
				<outer.Stepper.Content step="first">
					<Full flow={inner} />
				</outer.Stepper.Content>
			</outer.Stepper.Root>,
		);
		const panel = container.querySelector('[data-testid="outer"] > [data-component="stepper-content"]');
		expect(panel?.getAttribute("role")).toBe("group");
		expect(container.querySelectorAll('[role="tabpanel"]').length).toBe(1);
		expect(await violations(container)).toEqual([]);
	});
});

describe("valid structure", () => {
	it("renders phrasing content inside triggers and keeps headings outside", async () => {
		const { Stepper } = defineStepper(steps);
		const { container } = await render(
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Item step="first">
						<Stepper.Trigger>
							<Stepper.Title />
							<Stepper.Description />
						</Stepper.Trigger>
					</Stepper.Item>
				</Stepper.List>
				<Stepper.Item step="second" render={(props) => <div {...(props as React.ComponentProps<"div">)} />}>
					<Stepper.Title />
					<Stepper.Description />
				</Stepper.Item>
			</Stepper.Root>,
		);
		const trigger = container.querySelector("button");
		expect(trigger?.querySelector("h4, p")).toBeNull();
		expect(trigger?.querySelector('[data-component="stepper-title"]')?.tagName).toBe("SPAN");
		expect(container.querySelector("h4")?.textContent).toBe("Second");
		expect(container.querySelector("p")?.textContent).toBe("Then this");
	});

	it("tab items are presentational and triggers keep their ARIA", async () => {
		const flow = defineStepper(steps);
		const { container } = await render(<Full flow={flow} />);
		expect(container.querySelector("li")?.getAttribute("role")).toBe("presentation");
		const tab = screen.getByRole("tab", { name: /First/ }).element();
		expect(tab.getAttribute("aria-selected")).toBe("true");
		expect(tab.getAttribute("aria-current")).toBe("step");
		expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")?.getAttribute("aria-labelledby")).toBe(
			tab.id,
		);
	});
});

describe("focus", () => {
	it("moves to the new panel when Next becomes disabled on the last step", async () => {
		const flow = defineStepper(steps);
		await render(<Full flow={flow} defaultStep="second" />);
		const next = screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
		next.focus();
		await userEvent.click(next);
		expect(next.disabled).toBe(true);
		expect(document.activeElement?.id).toBe(
			screen.getByRole("tab", { name: /Third/ }).element().getAttribute("aria-controls"),
		);
	});

	it("moves to the new panel when the focused field unmounts with its step", async () => {
		const flow = defineStepper(steps);
		let api!: ReturnType<typeof flow.useStepper>;
		function Grab() {
			api = flow.useStepperContext();
			return null;
		}
		const { container } = await render(
			<flow.Stepper.Root>
				<Grab />
				<flow.Stepper.Content step="first">
					<input aria-label="Name" />
				</flow.Stepper.Content>
				<flow.Stepper.Content step="second">Two</flow.Stepper.Content>
			</flow.Stepper.Root>,
		);
		container.querySelector("input")?.focus();
		await act(async () => {
			await api.next();
		});
		expect(document.activeElement?.getAttribute("data-component")).toBe("stepper-content");
		expect(document.activeElement?.textContent).toBe("Two");
	});

	it("moves to the new panel when Next is replaced by another button on the last step", async () => {
		const flow = defineStepper(steps);
		await render(
			<flow.Stepper.Root defaultStep="second">
				{({ stepper }) => (
					<>
						<flow.Stepper.Content step={stepper.id}>{stepper.current.title}</flow.Stepper.Content>
						{stepper.isLast ? <button type="button">Save</button> : <flow.Stepper.Next>Continue</flow.Stepper.Next>}
					</>
				)}
			</flow.Stepper.Root>,
		);
		const next = screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
		next.focus();
		await userEvent.click(next);
		expect(next.isConnected).toBe(false);
		expect(document.activeElement?.getAttribute("data-component")).toBe("stepper-content");
	});

	it("stays on Next in the middle of the flow", async () => {
		const flow = defineStepper(steps);
		await render(<Full flow={flow} />);
		const next = screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
		await userEvent.click(next);
		expect(document.activeElement).toBe(next);
	});

	it("never steals focus that is outside the stepper", async () => {
		const flow = defineStepper(steps);
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		let api!: ReturnType<typeof flow.useStepper>;
		function Grab() {
			api = flow.useStepperContext();
			return null;
		}
		await render(
			<flow.Stepper.Root defaultStep="second">
				<Grab />
				<flow.Stepper.Content step="third">Three</flow.Stepper.Content>
				<flow.Stepper.Next>Continue</flow.Stepper.Next>
			</flow.Stepper.Root>,
		);
		outside.focus();
		await act(async () => {
			await api.next();
		});
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("a pending guard keeps the clicked button focusable and marks the stepper busy", async () => {
		let release!: (value: boolean) => void;
		const flow = defineStepper(steps);
		const { container } = await render(
			<Full
				flow={flow}
				beforeStepChange={() =>
					new Promise<boolean>((resolve) => {
						release = resolve;
					})
				}
			/>,
		);
		const next = screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
		next.focus();
		await userEvent.click(next);
		const root = container.querySelector('[data-component="stepper"]');
		expect(root?.getAttribute("aria-busy")).toBe("true");
		expect(root?.hasAttribute("data-pending")).toBe(true);
		expect(next.disabled).toBe(false);
		expect(next.getAttribute("aria-disabled")).toBe("true");
		expect(next.hasAttribute("data-pending")).toBe(true);
		await act(async () => release(false));
		expect(document.activeElement).toBe(next);
		expect(root?.hasAttribute("aria-busy")).toBe(false);
	});
});

describe("triggers", () => {
	it("blocked steps are natively disabled; a pending guard keeps the clicked trigger focused", async () => {
		let release!: (value: boolean) => void;
		const flow = defineStepper(steps);
		await render(
			<Full
				flow={flow}
				linear
				beforeStepChange={() =>
					new Promise<boolean>((resolve) => {
						release = resolve;
					})
				}
			/>,
		);
		const second = screen.getByRole("tab", { name: /Second/ }).element() as HTMLButtonElement;
		const third = screen.getByRole("tab", { name: /Third/ }).element() as HTMLButtonElement;
		expect(third.disabled).toBe(true);
		second.focus();
		await userEvent.click(second);
		// Pending: nothing is natively disabled that was not before, so focus survives a rejection.
		expect(second.disabled).toBe(false);
		expect(second.getAttribute("aria-disabled")).toBe("true");
		expect(third.disabled).toBe(true);
		await act(async () => release(false));
		expect(document.activeElement).toBe(second);
		expect(second.hasAttribute("aria-disabled")).toBe(false);
	});
});

describe("keyboard", () => {
	it("swaps horizontal arrows in right-to-left layouts", async () => {
		const flow = defineStepper(steps);
		await render(
			<div dir="rtl">
				<Full flow={flow} />
			</div>,
		);
		screen.getByRole("tab", { name: /First/ }).element().focus();
		await act(async () => {
			await userEvent.keyboard("{ArrowLeft}");
		});
		const second = screen.getByRole("tab", { name: /Second/ }).element();
		expect(second.getAttribute("aria-selected")).toBe("true");
		expect(document.activeElement).toBe(second);
	});
});

describe("refs and render", () => {
	it("forwards refs to every element primitive", async () => {
		const { Stepper } = defineStepper(steps);
		const refs = {
			root: React.createRef<HTMLDivElement>(),
			list: React.createRef<HTMLOListElement>(),
			item: React.createRef<HTMLLIElement>(),
			trigger: React.createRef<HTMLButtonElement>(),
			title: React.createRef<HTMLHeadingElement>(),
			content: React.createRef<HTMLDivElement>(),
			next: React.createRef<HTMLButtonElement>(),
		};
		await render(
			<Stepper.Root ref={refs.root}>
				<Stepper.List ref={refs.list}>
					<Stepper.Item step="first" ref={refs.item}>
						<Stepper.Trigger ref={refs.trigger}>
							<Stepper.Title ref={refs.title} />
						</Stepper.Trigger>
					</Stepper.Item>
				</Stepper.List>
				<Stepper.Content step="first" ref={refs.content}>
					A
				</Stepper.Content>
				<Stepper.Next ref={refs.next}>Next</Stepper.Next>
			</Stepper.Root>,
		);
		expect(refs.root.current?.dataset.component).toBe("stepper");
		expect(refs.list.current?.tagName).toBe("OL");
		expect(refs.item.current?.tagName).toBe("LI");
		expect(refs.trigger.current?.getAttribute("role")).toBe("tab");
		expect(refs.title.current?.tagName).toBe("SPAN");
		expect(refs.content.current?.getAttribute("role")).toBe("tabpanel");
		expect(refs.next.current?.textContent).toBe("Next");
	});

	it("render functions receive children and the ref", async () => {
		const { Stepper } = defineStepper(steps);
		const ref = React.createRef<HTMLButtonElement>();
		await render(
			<Stepper.Root>
				<Stepper.Next ref={ref} render={(props) => <button className="mine" {...props} />}>
					Continue
				</Stepper.Next>
			</Stepper.Root>,
		);
		expect(ref.current?.textContent).toBe("Continue");
		expect(ref.current?.className).toBe("mine");
	});
});

describe("useItem", () => {
	it("exposes the enclosing item", async () => {
		const flow = defineStepper(steps);
		function Badge() {
			const item = flow.Stepper.useItem();
			return (
				<span data-testid={`badge-${item.data.id}`}>
					{item.index + 1}/{item.count} {item.status} {String(item.canGoTo)}
				</span>
			);
		}
		await render(
			<flow.Stepper.Root linear>
				<flow.Stepper.Items>
					{() => (
						<flow.Stepper.Item>
							<Badge />
						</flow.Stepper.Item>
					)}
				</flow.Stepper.Items>
			</flow.Stepper.Root>,
		);
		expect(screen.getByTestId("badge-first").element().textContent).toBe("1/3 active true");
		expect(screen.getByTestId("badge-third").element().textContent).toBe("3/3 upcoming false");
	});
});

describe("development diagnostics", () => {
	async function codes(ui: React.ReactElement) {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await render(ui);
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		return seen;
	}

	it("warns about render functions that drop their props", async () => {
		const { Stepper } = defineStepper([{ id: "solo" }]);
		const seen = await codes(
			<Stepper.Root>
				<Stepper.List render={() => <ol />}>
					<Stepper.Item step="solo">
						<Stepper.Trigger>Solo</Stepper.Trigger>
					</Stepper.Item>
				</Stepper.List>
			</Stepper.Root>,
		);
		expect(seen.some((message) => message.includes("SZ001"))).toBe(true);
	});

	it("warns about a trigger without an accessible name, with a link", async () => {
		const { Stepper } = defineStepper([{ id: "nameless" }]);
		const seen = await codes(
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Item step="nameless">
						<Stepper.Trigger />
					</Stepper.Item>
				</Stepper.List>
			</Stepper.Root>,
		);
		expect(seen.some((message) => message.includes("SZ002") && message.includes("errors#sz002"))).toBe(true);
	});

	it("warns when navigation is accepted but a controlled step cannot move", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const flow = defineHeadless([{ id: "one" }, { id: "two" }]);
		const { result } = await renderHook(() => flow.useStepper({ step: "one" }));
		await act(async () => {
			await result.current.next();
		});
		expect(warn.mock.calls.some((call) => String(call[0]).includes("SZ004"))).toBe(true);
		warn.mockRestore();
	});
});

describe("stable references", () => {
	it("keeps unchanged closures across snapshots", async () => {
		const flow = defineHeadless(steps);
		const { result } = await renderHook(() => flow.useStepper());
		const before = result.current;
		await act(() => before.setComplete("first"));
		const after = result.current;
		expect(after).not.toBe(before);
		expect(after.data).toBe(before.data);
		expect(after.canGoTo).toBe(before.canGoTo);
		expect(after.match).toBe(before.match);
		expect(after.validate).toBe(before.validate);
		await act(() => after.data.set("first", 1));
		expect(result.current.data).not.toBe(after.data);
		expect(result.current.canGoTo).toBe(after.canGoTo);
		expect(result.current.data.get()).toBe(1);
		expect(after.data.get()).toBeUndefined();
	});
});

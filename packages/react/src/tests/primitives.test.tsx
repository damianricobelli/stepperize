import axe from "axe-core";
import React from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-react";
import { defineStepper } from "../index";
import { act } from "./act";

afterEach(cleanup);

const steps = [
	{ id: "first", title: "First", description: "Start here" },
	{ id: "second", title: "Second", description: "Then this" },
	{ id: "third", title: "Third", description: "Finish" },
] as const;
const flow = defineStepper(steps);
const { Stepper } = flow;
type Api = ReturnType<typeof flow.useStepper>;

async function violations(node: Element) {
	// `region` is about page landmarks, not a component rendered in isolation.
	const result = await axe.run(node, { rules: { region: { enabled: false } } });
	return result.violations.map(
		(violation) => `${violation.id}: ${violation.nodes.map((entry) => entry.html).join(" | ")}`,
	);
}

function Full(props: Partial<React.ComponentProps<typeof Stepper.Root>>) {
	return (
		<Stepper.Root {...props}>
			<Stepper.List>
				{() => (
					<Stepper.Item>
						<Stepper.Trigger>
							<Stepper.Indicator />
							<Stepper.Title />
							<Stepper.Description />
						</Stepper.Trigger>
					</Stepper.Item>
				)}
			</Stepper.List>
			{steps.map((step) => (
				<Stepper.Content key={step.id} step={step.id}>
					<label>
						{step.title} name
						<input />
					</label>
				</Stepper.Content>
			))}
			<Stepper.Prev>Back</Stepper.Prev>
			<Stepper.Next>Continue</Stepper.Next>
		</Stepper.Root>
	);
}

const next = () => screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
const region = (container: Element) => container.querySelector('[data-component="stepper"] > [aria-live="polite"]');

describe("patterns", () => {
	it("a free flow is a tablist: tabs own their panels and axe finds nothing", async () => {
		const { container } = await render(<Full />);
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(container.querySelector("li")?.getAttribute("role")).toBe("presentation");
		const tab = screen.getByRole("tab", { name: /First/ }).element();
		expect(tab.getAttribute("aria-selected")).toBe("true");
		expect([tab.getAttribute("aria-posinset"), tab.getAttribute("aria-setsize")]).toEqual(["1", "3"]);
		expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")?.getAttribute("aria-labelledby")).toBe(
			tab.id,
		);
		expect(tab.querySelector("h4, p")).toBeNull();
		expect(await violations(container)).toEqual([]);
		await userEvent.click(next());
		expect(await violations(container)).toEqual([]);
	});

	it("a linear flow is an ordered list of steps with aria-current, not tabs", async () => {
		const { container } = await render(<Full linear />);
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		expect(container.querySelector("li")?.hasAttribute("role")).toBe(false);
		const buttons = container.querySelectorAll<HTMLButtonElement>('[data-component="stepper-trigger"]');
		expect(Array.from(buttons, (button) => button.getAttribute("role"))).toEqual([null, null, null]);
		expect(buttons[0].getAttribute("aria-current")).toBe("step");
		// Only next() moves forward, so later steps are unavailable until then.
		expect(Array.from(buttons, (button) => button.disabled)).toEqual([false, true, true]);
		const panel = container.querySelector('[data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(await violations(container)).toEqual([]);
		await userEvent.click(next());
		expect(buttons[1].getAttribute("aria-current")).toBe("step");
		expect(buttons[0].dataset.state).toBe("complete");
		expect(buttons[0].disabled).toBe(false);
		expect(await violations(container)).toEqual([]);
	});

	it("a flow without triggers has no tabs: panels are groups named by the step title", async () => {
		const outer = defineStepper(steps);
		const { container } = await render(
			<outer.Stepper.Root data-testid="outer">
				<outer.Stepper.List>
					{() => (
						<outer.Stepper.Item>
							<outer.Stepper.Indicator />
						</outer.Stepper.Item>
					)}
				</outer.Stepper.List>
				<outer.Stepper.Content step="first">
					{/* A nested stepper's triggers are not this one's. */}
					<Full />
				</outer.Stepper.Content>
			</outer.Stepper.Root>,
		);
		const panel = container.querySelector('[data-testid="outer"] > [data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(container.querySelector('[data-testid="outer"] > ol')?.hasAttribute("role")).toBe(false);
		expect(container.querySelectorAll('[role="tabpanel"]').length).toBe(1);
		expect(await violations(container)).toEqual([]);
	});
});

describe("state and data attributes", () => {
	it("exposes step, state, validity and reachability for styling and automation", async () => {
		const schema = {
			"~standard": {
				version: 1 as const,
				vendor: "test",
				validate: (value: unknown) => (value === "ok" ? { value } : { issues: [{ message: "Required" }] }),
			},
		};
		const checked = defineStepper([
			{ id: "a", title: "A", schema },
			{ id: "b", title: "B" },
		]);
		let api!: ReturnType<typeof checked.useStepper>;
		function Grab() {
			api = checked.useStepperContext();
			return null;
		}
		const { container } = await render(
			<checked.Stepper.Root>
				<Grab />
				<checked.Stepper.List>
					{() => (
						<checked.Stepper.Item>
							<checked.Stepper.Trigger>
								<checked.Stepper.Indicator />
								<checked.Stepper.Title />
							</checked.Stepper.Trigger>
						</checked.Stepper.Item>
					)}
				</checked.Stepper.List>
			</checked.Stepper.Root>,
		);
		const item = container.querySelector<HTMLElement>('li[data-step="a"]');
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["current", false]);
		await act(async () => {
			expect(await api.next("nope")).toMatchObject({ accepted: false, reason: "invalid" });
		});
		expect(item?.hasAttribute("data-invalid")).toBe(true);
		expect(container.querySelector('[data-component="stepper-indicator"]')?.hasAttribute("data-invalid")).toBe(true);
		await act(async () => {
			await api.next("ok");
		});
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["complete", false]);
		expect(container.querySelector<HTMLElement>('li[data-step="b"]')?.dataset.state).toBe("current");
	});

	it("useItem reads the enclosing item", async () => {
		function Badge() {
			const item = Stepper.useItem();
			return (
				<span data-testid={`badge-${item.step.id}`}>
					{item.index + 1} {item.state} {String(item.disabled)} {String(item.pending)}
				</span>
			);
		}
		await render(
			<Stepper.Root linear>
				<Stepper.List>
					{() => (
						<Stepper.Item>
							<Badge />
						</Stepper.Item>
					)}
				</Stepper.List>
			</Stepper.Root>,
		);
		expect(screen.getByTestId("badge-first").element().textContent).toBe("1 current false false");
		expect(screen.getByTestId("badge-third").element().textContent).toBe("3 pending true false");
	});
});

describe("navigation", () => {
	it("Next finishes the flow on the last step", async () => {
		const onFinish = vi.fn();
		await render(<Full snapshot={{ step: "third", data: { first: 1 } }} onFinish={onFinish} />);
		expect(next().disabled).toBe(false);
		await userEvent.click(next());
		expect(onFinish).toHaveBeenCalledWith({ third: undefined }, { first: 1 });
		// Finished: the Root says so, and pressing again does not submit twice.
		const root = document.querySelector('[data-component="stepper"]');
		expect(root?.hasAttribute("data-finished")).toBe(true);
		expect(next().getAttribute("aria-disabled")).toBe("true");
		await userEvent.click(next(), { force: true });
		expect(onFinish).toHaveBeenCalledTimes(1);
	});

	it("reports what a click's move throws, and Next works again", async () => {
		const errors: unknown[] = [];
		const spy = vi.spyOn(globalThis, "reportError").mockImplementation((error) => {
			errors.push(error);
		});
		const onFinish = vi.fn().mockRejectedValueOnce(new Error("payment declined"));
		const guard = ({ direction }: { direction: string }) => {
			if (direction === "goTo") throw new Error("guard broke");
			return true;
		};
		await render(<Full snapshot={{ step: "third" }} onFinish={onFinish} guard={guard} />);
		await userEvent.click(next());
		await vi.waitFor(() => expect(errors).toHaveLength(1));
		expect(String(errors[0])).toMatch(/payment declined/);
		await userEvent.click(screen.getByRole("tab", { name: /First/ }));
		await vi.waitFor(() => expect(errors).toHaveLength(2));
		expect(String(errors[1])).toMatch(/guard broke/);
		await userEvent.click(next());
		await vi.waitFor(() => expect(onFinish).toHaveBeenCalledTimes(2));
		expect(document.querySelector('[data-component="stepper"]')?.hasAttribute("data-finished")).toBe(true);
		spy.mockRestore();
	});

	it("Prev is disabled at the start and returns along the path", async () => {
		await render(<Full />);
		const back = screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement;
		expect(back.disabled).toBe(true);
		await userEvent.click(next());
		expect(back.disabled).toBe(false);
		await userEvent.click(back);
		expect(screen.getByRole("tab", { name: /First/ }).element().getAttribute("aria-selected")).toBe("true");
	});

	it("respects preventDefault on the buttons and the list", async () => {
		const { container } = await render(
			<Stepper.Root>
				{(stepper) => (
					<>
						<output>{stepper.current.id}</output>
						<Stepper.List onKeyDown={(event) => event.preventDefault()}>
							{() => (
								<Stepper.Item>
									<Stepper.Trigger>
										<Stepper.Title />
									</Stepper.Trigger>
								</Stepper.Item>
							)}
						</Stepper.List>
						<Stepper.Next onClick={(event) => event.preventDefault()}>Continue</Stepper.Next>
					</>
				)}
			</Stepper.Root>,
		);
		await userEvent.click(next());
		screen.getByRole("tab", { name: "First" }).element().focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(container.querySelector("output")?.textContent).toBe("first");
	});

	it("arrow keys move between tabs, swapped in right-to-left layouts", async () => {
		await render(
			<div dir="rtl">
				<Full />
			</div>,
		);
		screen.getByRole("tab", { name: /First/ }).element().focus();
		await act(async () => {
			await userEvent.keyboard("{ArrowLeft}");
		});
		const second = screen.getByRole("tab", { name: /Second/ }).element();
		expect(second.getAttribute("aria-selected")).toBe("true");
		expect(document.activeElement).toBe(second);
		await act(async () => {
			await userEvent.keyboard("{End}");
		});
		expect(document.activeElement).toBe(screen.getByRole("tab", { name: /Third/ }).element());
	});
});

describe("focus and announcements", () => {
	it("announces the new step by its title while Next keeps focus", async () => {
		const { container } = await render(<Full />);
		expect(region(container)?.textContent).toBe("");
		next().focus();
		await userEvent.click(next());
		expect(document.activeElement).toBe(next());
		expect(region(container)?.textContent).toBe("Second");
	});

	it("moves focus to the new panel when the focused element unmounts, without announcing twice", async () => {
		let api!: Api;
		function Grab() {
			api = flow.useStepperContext();
			return null;
		}
		const { container } = await render(
			<Stepper.Root>
				<Grab />
				<Stepper.Content step="first">
					<input aria-label="Name" />
				</Stepper.Content>
				<Stepper.Content step="second">Two</Stepper.Content>
			</Stepper.Root>,
		);
		container.querySelector("input")?.focus();
		await act(async () => {
			await api.next();
		});
		expect(document.activeElement?.textContent).toBe("Two");
		expect(region(container)?.textContent).toBe("");
	});

	it("never moves focus that is outside the stepper", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		let api!: Api;
		function Grab() {
			api = flow.useStepperContext();
			return null;
		}
		await render(
			<Stepper.Root>
				<Grab />
				<Stepper.Content step="second">Two</Stepper.Content>
			</Stepper.Root>,
		);
		outside.focus();
		await act(async () => {
			await api.next();
		});
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("a running guard keeps the clicked control focusable and marks the stepper busy", async () => {
		let release!: (value: boolean) => void;
		const guard = () =>
			new Promise<boolean>((resolve) => {
				release = resolve;
			});
		const { container } = await render(<Full guard={guard} />);
		const second = screen.getByRole("tab", { name: /Second/ }).element() as HTMLButtonElement;
		second.focus();
		await userEvent.click(second);
		const root = container.querySelector('[data-component="stepper"]');
		expect([root?.getAttribute("aria-busy"), root?.hasAttribute("data-pending")]).toEqual(["true", true]);
		expect([second.disabled, second.getAttribute("aria-disabled")]).toEqual([false, "true"]);
		expect([next().disabled, next().getAttribute("aria-disabled"), next().hasAttribute("data-pending")]).toEqual([
			false,
			"true",
			true,
		]);
		await act(async () => release(false));
		expect(document.activeElement).toBe(second);
		expect(root?.hasAttribute("aria-busy")).toBe(false);
		expect(second.hasAttribute("aria-disabled")).toBe(false);
	});
});

describe("refs and render", () => {
	it("forwards refs to every primitive and renders text as spans", async () => {
		const refs = {
			root: React.createRef<HTMLDivElement>(),
			list: React.createRef<HTMLOListElement>(),
			item: React.createRef<HTMLLIElement>(),
			trigger: React.createRef<HTMLButtonElement>(),
			title: React.createRef<HTMLSpanElement>(),
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
				<Stepper.Next ref={refs.next} render={(props) => <button className="mine" {...props} />}>
					Continue
				</Stepper.Next>
			</Stepper.Root>,
		);
		expect(Object.values(refs).map((ref) => ref.current?.tagName)).toEqual([
			"DIV",
			"OL",
			"LI",
			"BUTTON",
			"SPAN",
			"DIV",
			"BUTTON",
		]);
		expect([refs.next.current?.className, refs.next.current?.textContent]).toEqual(["mine", "Continue"]);
	});
});

describe("development diagnostics", () => {
	async function warnings(ui: React.ReactElement) {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await render(ui);
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		return seen;
	}

	it("warns about render functions that drop their props", async () => {
		const seen = await warnings(
			<Stepper.Root>
				<Stepper.List render={() => <ol />} />
			</Stepper.Root>,
		);
		expect(seen.some((message) => message.includes("SZ001"))).toBe(true);
	});

	it("warns about a trigger without a name or outside a list, with a link", async () => {
		const seen = await warnings(
			<Stepper.Root>
				<Stepper.Item step="first" render={(props) => <div {...(props as React.ComponentProps<"div">)} />}>
					<Stepper.Trigger />
				</Stepper.Item>
			</Stepper.Root>,
		);
		expect(seen.some((message) => message.includes("SZ002") && message.includes("errors#sz002"))).toBe(true);
		expect(seen.some((message) => message.includes("SZ003"))).toBe(true);
	});

	it("throws coded errors outside a Root or an Item", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(render(<Stepper.Next>Continue</Stepper.Next>)).rejects.toThrow(/SZ100/);
		await expect(
			render(
				<Stepper.Root>
					<Stepper.Indicator />
				</Stepper.Root>,
			),
		).rejects.toThrow(/SZ101/);
		error.mockRestore();
	});

	it("throws SZ102 for a Content of an unknown step, active or not", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(
			render(
				<Stepper.Root>
					<Stepper.Content step={"secnod" as never}>Typo</Stepper.Content>
				</Stepper.Root>,
			),
		).rejects.toThrow(/SZ102/);
		error.mockRestore();
	});
});

describe("hydration", () => {
	it("keeps the server HTML: nothing changes until the user acts", async () => {
		const ui = (
			<>
				<Full snapshot={{ step: "second", complete: ["first"] }} />
				<Full />
			</>
		);
		const container = document.createElement("div");
		container.innerHTML = renderToString(ui);
		document.body.appendChild(container);
		const original = container.innerHTML;
		const ids = Array.from(container.querySelectorAll("[id]"), (node) => node.id);
		expect(new Set(ids).size).toBe(ids.length);
		const recoverable = vi.fn();
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		let root!: ReturnType<typeof hydrateRoot>;
		await act(async () => {
			root = hydrateRoot(container, ui, { onRecoverableError: recoverable });
		});
		expect(recoverable).not.toHaveBeenCalled();
		expect(errors).not.toHaveBeenCalled();
		expect(container.innerHTML).toBe(original);
		await act(async () => root.unmount());
		container.remove();
		errors.mockRestore();
	});
});

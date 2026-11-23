import axe from "axe-core";
import { batch, createSignal, For, type JSX, Show, sharedConfig } from "solid-js";
import { hydrate } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, page as screen, userEvent } from "vitest/browser";
import { defineStepper } from "../index";
import { type Api, Fancy, Full, flow, groups, page, Stepper, steps } from "./fixtures";
import { cleanup, render, settle } from "./render";

declare module "vitest/browser" {
	interface BrowserCommands {
		renderOnServer: (name: "page" | "groups") => Promise<{ html: string; script: string }>;
	}
}

afterEach(cleanup);

async function violations(node: Element) {
	// `region` is about page landmarks, not a component rendered in isolation.
	const result = await axe.run(node, { rules: { region: { enabled: false } } });
	return result.violations.map(
		(violation) => `${violation.id}: ${violation.nodes.map((entry) => entry.html).join(" | ")}`,
	);
}

/** The element, or a failed test. */
function must<T>(value: T | null | undefined): T {
	if (value == null) throw new Error("Element not found");
	return value;
}

const next = () => screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
const region = (container: Element) => container.querySelector('[data-component="stepper"] > [aria-live="polite"]');

/** Hands the shared flow of the Root it is rendered in to the test. */
function Grab(props: { ready: (stepper: Api) => void }) {
	props.ready(flow.useStepperContext());
	return null;
}

describe("patterns", () => {
	it("a free flow is a tablist: tabs own their panels and axe finds nothing", async () => {
		const { container } = render(() => <Full />);
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
		expect(
			screen
				.getByRole("tab", { name: /Second/ })
				.element()
				.getAttribute("aria-selected"),
		).toBe("true");
		expect(await violations(container)).toEqual([]);
	});

	it("a linear flow is an ordered list of steps with aria-current, not tabs", async () => {
		const { container } = render(() => <Full linear />);
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
		const { container } = render(() => (
			<outer.Stepper.Root data-testid="outer">
				<outer.Stepper.List>
					{(_step) => (
						<outer.Stepper.Item>
							<outer.Stepper.Indicator />
						</outer.Stepper.Item>
					)}
				</outer.Stepper.List>
				<outer.Stepper.Content step="first">
					{/* A nested stepper's triggers are not this one's. */}
					<Full />
				</outer.Stepper.Content>
			</outer.Stepper.Root>
		));
		await settle();
		const panel = container.querySelector('[data-testid="outer"] > [data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(container.querySelector('[data-testid="outer"] > ol')?.hasAttribute("role")).toBe(false);
		expect(container.querySelectorAll('[role="tabpanel"]').length).toBe(1);
		expect(await violations(container)).toEqual([]);
	});

	it("becomes a tablist when its triggers appear later, and stops when they leave", async () => {
		const [show, setShow] = createSignal(false);
		const { container } = render(() => (
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Item step="first">
						<Show when={show()}>
							<Stepper.Trigger>First</Stepper.Trigger>
						</Show>
					</Stepper.Item>
				</Stepper.List>
			</Stepper.Root>
		));
		await settle();
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		setShow(true);
		await settle();
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		setShow(false);
		await settle();
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
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
		function Probe() {
			api = checked.useStepperContext();
			return null;
		}
		const { container } = render(() => (
			<checked.Stepper.Root>
				<Probe />
				<checked.Stepper.List>
					{(_step) => (
						<checked.Stepper.Item>
							<checked.Stepper.Trigger>
								<checked.Stepper.Indicator />
								<checked.Stepper.Title />
							</checked.Stepper.Trigger>
						</checked.Stepper.Item>
					)}
				</checked.Stepper.List>
			</checked.Stepper.Root>
		));
		const item = container.querySelector<HTMLElement>('li[data-step="a"]');
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["current", false]);
		expect(await api.next("nope")).toMatchObject({ accepted: false, reason: "invalid" });
		expect(item?.hasAttribute("data-invalid")).toBe(true);
		expect(container.querySelector('[data-component="stepper-indicator"]')?.hasAttribute("data-invalid")).toBe(true);
		await api.next("ok");
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["complete", false]);
		expect(container.querySelector<HTMLElement>('li[data-step="b"]')?.dataset.state).toBe("current");
	});

	it("useItem and the Item function read the enclosing item", () => {
		function Badge() {
			const item = Stepper.useItem();
			return (
				<span data-testid={`badge-${item.step.id}`}>
					{item.index + 1} {item.state} {String(item.disabled)} {String(item.pending)}
				</span>
			);
		}
		render(() => (
			<Stepper.Root linear>
				<Stepper.List>
					{(_step) => (
						<Stepper.Item>
							{(item) => (
								<>
									<Badge />
									<i data-testid={`arg-${item.step.id}`}>{item.state}</i>
								</>
							)}
						</Stepper.Item>
					)}
				</Stepper.List>
			</Stepper.Root>
		));
		expect(screen.getByTestId("badge-first").element().textContent).toBe("1 current false false");
		expect(screen.getByTestId("badge-third").element().textContent).toBe("3 pending true false");
		expect(screen.getByTestId("arg-first").element().textContent).toBe("current");
	});

	it("keeps an inactive panel mounted and hidden with forceMount", () => {
		const { container } = render(() => (
			<Stepper.Root>
				<Stepper.Content step="first">One</Stepper.Content>
				<Stepper.Content step="second" forceMount>
					Two
				</Stepper.Content>
				<Stepper.Content step="third">Three</Stepper.Content>
			</Stepper.Root>
		));
		const panels = container.querySelectorAll<HTMLElement>('[data-component="stepper-content"]');
		expect(Array.from(panels, (panel) => [panel.dataset.step, panel.hidden])).toEqual([
			["first", false],
			["second", true],
		]);
	});

	it("forceMount keeps what was typed while the user moves away and back", async () => {
		let api!: Api;
		const { container } = render(() => (
			<Stepper.Root>
				<Grab ready={(stepper) => (api = stepper)} />
				<Stepper.Content step="first" forceMount>
					<input aria-label="Name" />
				</Stepper.Content>
				<Stepper.Content step="second" forceMount>
					Two
				</Stepper.Content>
			</Stepper.Root>
		));
		const input = must(container.querySelector("input"));
		await userEvent.fill(input, "Ada");
		await api.next();
		const panels = () => Array.from(container.querySelectorAll<HTMLElement>("[data-step]"), (panel) => panel.hidden);
		expect(panels()).toEqual([true, false]);
		await api.prev();
		expect(panels()).toEqual([false, true]);
		expect(container.querySelector("input")).toBe(input);
		expect(input.value).toBe("Ada");
	});
});

describe("navigation", () => {
	it("Next finishes the flow on the last step", async () => {
		const onFinish = vi.fn();
		render(() => <Full snapshot={{ step: "third", data: { first: 1 } }} onFinish={onFinish} />);
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
		render(() => <Full snapshot={{ step: "third" }} onFinish={onFinish} guard={guard} />);
		await userEvent.click(next());
		await vi.waitFor(() => expect(errors).toHaveLength(1));
		expect(String(errors[0])).toMatch(/payment declined/);
		await userEvent.click(screen.getByRole("tab", { name: /First/ }));
		await vi.waitFor(() => expect(errors).toHaveLength(2));
		expect(String(errors[1])).toMatch(/guard broke/);
		await userEvent.click(next());
		await vi.waitFor(() => expect(onFinish).toHaveBeenCalledTimes(2));
		spy.mockRestore();
	});

	it("Prev is disabled at the start and returns along the path", async () => {
		render(() => <Full />);
		const back = screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement;
		expect(back.disabled).toBe(true);
		await userEvent.click(next());
		expect(back.disabled).toBe(false);
		await userEvent.click(back);
		expect(screen.getByRole("tab", { name: /First/ }).element().getAttribute("aria-selected")).toBe("true");
	});

	it("respects preventDefault on the buttons and the list", async () => {
		const { container } = render(() => (
			<Stepper.Root class="mine" data-extra="yes">
				{(stepper) => (
					<>
						<output>{stepper.current.id}</output>
						<Stepper.List onKeyDown={(event) => event.preventDefault()}>
							{(_step) => (
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
			</Stepper.Root>
		));
		const root = container.querySelector<HTMLElement>(".mine");
		expect([root?.dataset.extra, root?.dataset.component]).toEqual(["yes", "stepper"]);
		await userEvent.click(next());
		screen.getByRole("tab", { name: "First" }).element().focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(container.querySelector("output")?.textContent).toBe("first");
	});

	it("the Root function follows the flow", async () => {
		const { container } = render(() => (
			<Stepper.Root>
				{(stepper) => (
					<>
						<output>{stepper.current.id}</output>
						<Stepper.Next>Continue</Stepper.Next>
					</>
				)}
			</Stepper.Root>
		));
		await userEvent.click(next());
		expect(container.querySelector("output")?.textContent).toBe("second");
	});

	it("arrow keys move between tabs, swapped in right-to-left layouts", async () => {
		render(() => (
			<div dir="rtl">
				<Full />
			</div>
		));
		screen.getByRole("tab", { name: /First/ }).element().focus();
		await userEvent.keyboard("{ArrowLeft}");
		const second = screen.getByRole("tab", { name: /Second/ }).element();
		expect(second.getAttribute("aria-selected")).toBe("true");
		expect(document.activeElement).toBe(second);
		await userEvent.keyboard("{End}");
		expect(document.activeElement).toBe(screen.getByRole("tab", { name: /Third/ }).element());
	});

	it("a vertical list moves with up and down, not left and right", async () => {
		const { container } = render(() => <Full orientation="vertical" />);
		expect(container.querySelector("ol")?.getAttribute("aria-orientation")).toBe("vertical");
		const tab = (name: RegExp) => screen.getByRole("tab", { name }).element();
		tab(/First/).focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(document.activeElement).toBe(tab(/First/));
		await userEvent.keyboard("{ArrowDown}");
		expect([document.activeElement, tab(/Second/).getAttribute("aria-selected")]).toEqual([tab(/Second/), "true"]);
		await userEvent.keyboard("{ArrowUp}");
		expect(document.activeElement).toBe(tab(/First/));
	});
});

describe("focus and announcements", () => {
	it("announces the new step by its title while Next keeps focus", async () => {
		const { container } = render(() => <Full />);
		expect(region(container)?.textContent).toBe("");
		next().focus();
		await userEvent.click(next());
		expect(document.activeElement).toBe(next());
		expect(region(container)?.textContent).toBe("Second");
	});

	it("moves focus to the new panel when the focused element unmounts, without announcing twice", async () => {
		let api!: Api;
		const { container } = render(() => (
			<Stepper.Root>
				<Grab ready={(stepper) => (api = stepper)} />
				<Stepper.Content step="first">
					<input aria-label="Name" />
				</Stepper.Content>
				<Stepper.Content step="second">Two</Stepper.Content>
			</Stepper.Root>
		));
		container.querySelector("input")?.focus();
		await api.next();
		await settle();
		expect(document.activeElement?.textContent).toBe("Two");
		expect(region(container)?.textContent).toBe("");
	});

	it("never moves focus that is outside the stepper", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		let api!: Api;
		render(() => (
			<Stepper.Root>
				<Grab ready={(stepper) => (api = stepper)} />
				<Stepper.Content step="second">Two</Stepper.Content>
			</Stepper.Root>
		));
		outside.focus();
		await api.next();
		await settle();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("a running guard keeps the clicked control focusable and marks the stepper busy", async () => {
		let release!: (value: boolean) => void;
		const guard = () =>
			new Promise<boolean>((resolve) => {
				release = resolve;
			});
		const { container } = render(() => <Full guard={guard} />);
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
		release(false);
		await settle();
		expect(document.activeElement).toBe(second);
		expect(root?.hasAttribute("aria-busy")).toBe(false);
		expect(second.hasAttribute("aria-disabled")).toBe(false);
	});
});

describe("refs and as", () => {
	it("forwards refs to every primitive and renders text as spans", () => {
		const refs: Record<string, Element | undefined> = {};
		const to = (name: string) => (node: Element) => {
			refs[name] = node;
		};
		render(() => (
			<Stepper.Root ref={to("root")}>
				<Stepper.List ref={to("list")}>
					<Stepper.Item step="first" ref={to("item")}>
						<Stepper.Trigger ref={to("trigger")}>
							<Stepper.Title ref={to("title")} />
						</Stepper.Trigger>
					</Stepper.Item>
				</Stepper.List>
				<Stepper.Content step="first" ref={to("content")}>
					A
				</Stepper.Content>
				<Stepper.Next ref={to("next")}>Continue</Stepper.Next>
			</Stepper.Root>
		));
		expect(["root", "list", "item", "trigger", "title", "content", "next"].map((name) => refs[name]?.tagName)).toEqual([
			"DIV",
			"OL",
			"LI",
			"BUTTON",
			"SPAN",
			"DIV",
			"BUTTON",
		]);
	});

	it("as hands ARIA, ids and handlers to your own element or component", async () => {
		const { container } = render(() => (
			<Stepper.Root>
				{(stepper) => (
					<>
						<output>{stepper.current.id}</output>
						<Stepper.List as="nav">
							<Stepper.Item step="first" as="div">
								<Stepper.Trigger
									as={(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href="#first" {...props} />}
								>
									First
								</Stepper.Trigger>
							</Stepper.Item>
						</Stepper.List>
						<Stepper.Next as={Fancy}>Continue</Stepper.Next>
					</>
				)}
			</Stepper.Root>
		));
		expect(container.querySelector("nav")?.dataset.component).toBe("stepper-list");
		expect(container.querySelector<HTMLElement>("nav > div")?.dataset.state).toBe("current");
		const link = container.querySelector("a");
		expect([link?.getAttribute("role"), link?.getAttribute("href"), link?.hasAttribute("type")]).toEqual([
			"tab",
			"#first",
			false,
		]);
		const button = next();
		expect([button.className, button.dataset.component, button.type]).toEqual(["mine", "stepper-next", "submit"]);
		await userEvent.click(button);
		expect(container.querySelector("output")?.textContent).toBe("second");
	});

	it("an `as` component on any primitive gets the ARIA, the handlers and the ref", async () => {
		const Panel = (props: JSX.HTMLAttributes<HTMLElement>) => <section {...props} />;
		const Row = (props: JSX.HTMLAttributes<HTMLDivElement>) => <div {...props} />;
		const refs: Element[] = [];
		const { container } = render(() => (
			<Stepper.Root>
				<Stepper.List as={Row} ref={(node) => refs.push(node)}>
					{(step) => (
						<Stepper.Item as={Row}>
							<Stepper.Trigger as="a" href={`#${step.id}`} ref={(node) => refs.push(node)}>
								<Stepper.Title as="strong" />
							</Stepper.Trigger>
						</Stepper.Item>
					)}
				</Stepper.List>
				<Stepper.Content step="first" as={Panel} ref={(node) => refs.push(node)}>
					One
				</Stepper.Content>
				<Stepper.Content step="second" as={Panel}>
					Two
				</Stepper.Content>
			</Stepper.Root>
		));
		expect(refs.map((node) => node.tagName).sort()).toEqual(["A", "A", "A", "DIV", "SECTION"]);
		expect(refs.find((node) => node.tagName === "DIV")?.getAttribute("role")).toBe("tablist");
		const panel = container.querySelector("section");
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-labelledby")]).toEqual([
			"tabpanel",
			container.querySelector('a[href="#first"]')?.id,
		]);
		await userEvent.click(screen.getByRole("tab", { name: "Second" }));
		expect(container.querySelector("section")?.textContent).toBe("Two");
		expect(await violations(container)).toEqual([]);
	});
});

describe("function children", () => {
	it("a List whose child is <For> renders it as content, like any other accessor", () => {
		const { container } = render(() => (
			<Stepper.Root>
				<Stepper.List>
					<For each={steps}>
						{(step) => (
							<Stepper.Item step={step.id}>
								<Stepper.Trigger>
									<Stepper.Title />
								</Stepper.Trigger>
							</Stepper.Item>
						)}
					</For>
				</Stepper.List>
			</Stepper.Root>
		));
		expect(Array.from(container.querySelectorAll("li"), (item) => item.dataset.step)).toEqual([
			"first",
			"second",
			"third",
		]);
		expect(screen.getByRole("tab", { name: "Second" }).element()).toBeTruthy();
	});

	it("a function without parameters is content, not a render function", () => {
		const { container } = render(() => (
			<Stepper.Root>
				<Stepper.List>{() => <Stepper.Item step="second" />}</Stepper.List>
			</Stepper.Root>
		));
		expect(Array.from(container.querySelectorAll("li"), (item) => item.dataset.step)).toEqual(["second"]);
	});

	it("Root, List and Item functions run once: only the JSX that reads the flow updates", async () => {
		const calls = { root: 0, list: 0, item: 0 };
		const { container } = render(() => (
			<Stepper.Root>
				{(stepper) => {
					calls.root++;
					// Read at the top level, where it is not tracked.
					const first = stepper.current.id;
					return (
						<>
							<output>
								{first} {stepper.current.id}
							</output>
							<Stepper.List>
								{(step) => {
									calls.list++;
									void stepper.index;
									return (
										<Stepper.Item>
											{(item) => {
												calls.item++;
												void item.state;
												return (
													<Stepper.Trigger>
														{step.title} {item.state}
													</Stepper.Trigger>
												);
											}}
										</Stepper.Item>
									);
								}}
							</Stepper.List>
							<Stepper.Next>Continue</Stepper.Next>
						</>
					);
				}}
			</Stepper.Root>
		));
		await userEvent.click(next());
		await userEvent.click(next());
		expect(calls).toEqual({ root: 1, list: 3, item: 3 });
		expect(container.querySelector("output")?.textContent).toBe("first third");
		expect(Array.from(container.querySelectorAll("button[role=tab]"), (tab) => tab.textContent)).toEqual([
			"First complete",
			"Second complete",
			"Third current",
		]);
	});
});

describe("options as props", () => {
	it("the Root follows its `step` prop and reports what it cannot follow", async () => {
		const [param, setParam] = createSignal<string>("third");
		const { container } = render(() => (
			<Full
				linear
				step={param()}
				onChange={(snapshot) => setParam(snapshot.step)}
				onInvalidStep={(current) => setParam(current)}
			/>
		));
		const current = () => container.querySelector('[aria-current="step"]')?.textContent;
		await settle();
		// A deep link to a step `linear` does not allow yet is corrected.
		expect([param(), current()]).toEqual(["first", expect.stringContaining("First")]);
		await userEvent.click(next());
		expect([param(), current()]).toEqual(["second", expect.stringContaining("Second")]);
		setParam("first");
		await settle();
		expect(current()).toContain("First");
	});

	it("uses the callback passed in the same batch as the click", async () => {
		const first = vi.fn();
		const second = vi.fn();
		const [onFinish, setOnFinish] = createSignal(first);
		render(() => <Full snapshot={{ step: "third" }} onFinish={onFinish()} />);
		await settle();
		batch(() => {
			setOnFinish(() => second);
			next().click();
		});
		await settle();
		expect([first.mock.calls.length, second.mock.calls.length]).toEqual([0, 1]);
	});
});

describe("development diagnostics", () => {
	async function warnings(ui: () => JSX.Element) {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		render(ui);
		await settle();
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		return seen;
	}

	it("warns about an `as` component that drops its props", async () => {
		const seen = await warnings(() => (
			<Stepper.Root>
				{/* @ts-expect-error a component without props is refused by the types; JavaScript callers get the warning */}
				<Stepper.List as={() => <ol />} />
			</Stepper.Root>
		));
		expect(seen.some((message) => message.includes("SZ001"))).toBe(true);
	});

	it("warns about a trigger without a name or outside a list, with a link", async () => {
		const seen = await warnings(() => (
			<Stepper.Root>
				<Stepper.Item step="first" as="div">
					<Stepper.Trigger />
				</Stepper.Item>
			</Stepper.Root>
		));
		expect(seen.some((message) => message.includes("SZ002") && message.includes("errors#sz002"))).toBe(true);
		expect(seen.some((message) => message.includes("SZ003"))).toBe(true);
	});

	it("throws coded errors outside a Root or an Item, and for unknown steps", () => {
		expect(() => render(() => <Stepper.Next>Continue</Stepper.Next>)).toThrow(/SZ100/);
		expect(() =>
			render(() => (
				<Stepper.Root>
					<Stepper.Indicator />
				</Stepper.Root>
			)),
		).toThrow(/SZ101/);
		expect(() =>
			render(() => (
				<Stepper.Root>
					<Stepper.Item step={"nope" as "first"} />
				</Stepper.Root>
			)),
		).toThrow(/SZ102/);
		// A Content of an unknown step is never current: it throws whether it is shown or not.
		expect(() =>
			render(() => (
				<Stepper.Root>
					<Stepper.Content step={"secnod" as "first"}>Typo</Stepper.Content>
				</Stepper.Root>
			)),
		).toThrow(/SZ102/);
	});
});

describe("hydration", () => {
	/** Put a fixture's server HTML in the document, as a SolidStart page would arrive. */
	async function serve(name: "page" | "groups") {
		const server = await commands.renderOnServer(name);
		const container = document.createElement("div");
		container.innerHTML = server.html;
		document.body.appendChild(container);
		// A fresh page load: Solid hydrates once per page, and the previous test already did.
		// The script only sets up its global once, and Solid remembers that hydration is done.
		Reflect.deleteProperty(window, "_$HY");
		sharedConfig.done = false;
		new Function(server.script.replace(/<\/?script[^>]*>/g, ""))();
		const attributes = () =>
			Array.from(container.querySelectorAll<HTMLElement>("*"), (node) =>
				Array.from(
					node.attributes,
					// Hydration writes `style` back through the CSSOM, which only reformats the same declarations.
					(attribute) => `${attribute.name}=${attribute.name === "style" ? node.style.cssText : attribute.value}`,
				).join(" "),
			);
		const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		return {
			container,
			attributes,
			hydrate: async () => {
				const dispose = hydrate(name === "page" ? page : groups, container);
				await settle();
				expect(warnings).not.toHaveBeenCalled();
				expect(errors).not.toHaveBeenCalled();
				warnings.mockRestore();
				errors.mockRestore();
				return () => {
					dispose();
					container.remove();
				};
			},
		};
	}

	it("keeps the server HTML of free, linear and resumed flows: nothing changes until the user acts", async () => {
		const { container, attributes, hydrate } = await serve("page");
		const roots = () => container.querySelectorAll('[data-component="stepper"]');
		// The free flow and the extras are tabs; the linear flow is a list with `aria-current`.
		expect(container.querySelectorAll('[role="tablist"]').length).toBe(2);
		expect(roots()[1].querySelector('[aria-current="step"]')?.textContent).toContain("Second");
		const ids = Array.from(container.querySelectorAll("[id]"), (node) => node.id);
		expect(new Set(ids).size).toBe(ids.length);
		const before = { text: container.textContent, attributes: attributes(), nodes: container.querySelectorAll("*") };
		const done = await hydrate();
		// The same elements, untouched: hydration adopted them instead of rendering again.
		const after = container.querySelectorAll("*");
		expect(after.length).toBe(before.nodes.length);
		expect(Array.from(after).every((node, index) => node === before.nodes[index])).toBe(true);
		expect(attributes()).toEqual(before.attributes);
		expect(container.textContent).toBe(before.text);
		// Hydrated, not inert: the linear flow moves on and its list follows.
		await userEvent.click(must(roots()[1].querySelector<HTMLElement>('[data-component="stepper-next"]')));
		expect(roots()[1].querySelector('[aria-current="step"]')?.textContent).toContain("Third");
		done();
	});

	it("hydrates a Root function, `as` tags and components, and panels kept mounted", async () => {
		const { container, hydrate } = await serve("page");
		const extras = () => must(container.querySelector('[data-testid="extras"]'));
		const panels = () => Array.from(extras().querySelectorAll<HTMLElement>("section"), (panel) => panel.hidden);
		// Every panel is in the server HTML, only the current one visible.
		expect(panels()).toEqual([false, true, true]);
		expect(extras().querySelector("output")?.textContent).toBe("First");
		const links = extras().querySelectorAll("a");
		expect(Array.from(links, (link) => [link.getAttribute("role"), link.getAttribute("href")])).toEqual([
			["tab", "#first"],
			["tab", "#second"],
			["tab", "#third"],
		]);
		const done = await hydrate();
		const next = must(extras().querySelector<HTMLButtonElement>(".mine"));
		expect([next.type, next.dataset.component]).toEqual(["submit", "stepper-next"]);
		await userEvent.click(next);
		expect(extras().querySelector("output")?.textContent).toBe("Second");
		expect(panels()).toEqual([true, false, true]);
		await userEvent.click(links[2]);
		expect(extras().querySelector("output")?.textContent).toBe("Third");
		done();
	});

	it("a flow without triggers is served as tabs and becomes groups once hydrated, without a mismatch", async () => {
		const { container, hydrate } = await serve("groups");
		const panel = () => container.querySelector('[data-component="stepper-content"]');
		expect(panel()?.getAttribute("role")).toBe("tabpanel");
		const node = panel();
		const done = await hydrate();
		expect(panel()).toBe(node);
		expect([panel()?.getAttribute("role"), panel()?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		done();
	});
});

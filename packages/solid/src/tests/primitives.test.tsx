import axe from "axe-core";
import { createSignal, type JSX, Show } from "solid-js";
import { hydrate } from "solid-js/web";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, page as screen, userEvent } from "vitest/browser";
import { defineStepper } from "../index";
import { type Api, Fancy, Full, flow, page, Stepper, steps } from "./fixtures";
import { cleanup, render, settle } from "./render";

declare module "vitest/browser" {
	interface BrowserCommands {
		renderOnServer: () => Promise<{ html: string; script: string }>;
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
					{() => (
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
					{() => (
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
	});
});

describe("hydration", () => {
	it("keeps the server HTML: nothing changes until the user acts", async () => {
		const server = await commands.renderOnServer();
		const container = document.createElement("div");
		container.innerHTML = server.html;
		document.body.appendChild(container);
		// What `generateHydrationScript()` puts in the document head.
		new Function(server.script.replace(/<\/?script[^>]*>/g, ""))();
		expect(container.querySelectorAll('[role="tablist"]').length).toBe(2);
		const ids = Array.from(container.querySelectorAll("[id]"), (node) => node.id);
		expect(new Set(ids).size).toBe(ids.length);
		const attributes = () =>
			Array.from(container.querySelectorAll("*"), (node) =>
				Array.from(
					node.attributes,
					// Hydration writes `style` back through the CSSOM, which only reformats the same declarations.
					(attribute) =>
						`${attribute.name}=${attribute.name === "style" ? (node as HTMLElement).style.cssText : attribute.value}`,
				).join(" "),
			);
		const before = { text: container.textContent, attributes: attributes(), nodes: container.querySelectorAll("*") };
		const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const dispose = hydrate(page, container);
		await settle();
		expect(warnings).not.toHaveBeenCalled();
		expect(errors).not.toHaveBeenCalled();
		// The same elements, untouched: hydration adopted them instead of rendering again.
		const after = container.querySelectorAll("*");
		expect(after.length).toBe(before.nodes.length);
		expect(Array.from(after).every((node, index) => node === before.nodes[index])).toBe(true);
		expect(attributes()).toEqual(before.attributes);
		expect(container.textContent).toBe(before.text);
		// Hydrated, not inert.
		await userEvent.click(container.querySelectorAll<HTMLElement>('[data-component="stepper-next"]')[1]);
		expect(container.querySelectorAll('[aria-selected="true"]')[1]?.textContent).toContain("Second");
		dispose();
		container.remove();
		warnings.mockRestore();
		errors.mockRestore();
	});
});

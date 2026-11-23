import axe from "axe-core";
import { flushSync, hydrate, tick, unmount } from "svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { commands, page as screen, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-svelte";
import Controlled from "./fixtures/Controlled.svelte";
import Full from "./fixtures/Full.svelte";
import type { Api } from "./fixtures/flow";
import Parts from "./fixtures/Parts.svelte";
import Scenario from "./fixtures/Scenario.svelte";

declare module "vitest/browser" {
	interface BrowserCommands {
		renderOnServer: (props: Record<string, unknown>) => Promise<string>;
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

const full = (props: Record<string, unknown> = {}) => render(Full, { props });
const scenario = (name: string, props: Record<string, unknown> = {}) => render(Scenario, { props: { name, ...props } });
const next = () => screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
const parts = (name: string, props: Record<string, unknown> = {}) => render(Parts, { props: { name, ...props } });
const tab = (name: RegExp | string) => screen.getByRole("tab", { name }).element() as HTMLButtonElement;
const region = (container: Element) => container.querySelector('[data-component="stepper"] > [aria-live="polite"]');

describe("patterns", () => {
	it("a free flow is a tablist: tabs own their panels and axe finds nothing", async () => {
		const { container } = await full();
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
		const { container } = await full({ linear: true });
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
		const { container } = await scenario("nested");
		await tick();
		const panel = container.querySelector('[data-testid="outer"] > [data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(container.querySelector('[data-testid="outer"] > ol')?.hasAttribute("role")).toBe(false);
		expect(container.querySelectorAll('[role="tabpanel"]').length).toBe(1);
		expect(await violations(container)).toEqual([]);
	});

	it("becomes a tablist when its triggers appear later", async () => {
		const { container, rerender } = await scenario("late");
		await tick();
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		await rerender({ show: true });
		await tick();
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("tablist");
	});
});

describe("state and data attributes", () => {
	it("exposes step, state, validity and reachability for styling and automation", async () => {
		let api!: { next: (data?: unknown) => Promise<unknown> };
		const { container } = await scenario("checked", { ready: (stepper: typeof api) => (api = stepper) });
		const item = container.querySelector<HTMLElement>('li[data-step="a"]');
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["current", false]);
		expect(await api.next("nope")).toMatchObject({ accepted: false, reason: "invalid" });
		flushSync();
		expect(item?.hasAttribute("data-invalid")).toBe(true);
		expect(container.querySelector('[data-component="stepper-indicator"]')?.hasAttribute("data-invalid")).toBe(true);
		await api.next("ok");
		flushSync();
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["complete", false]);
		expect(container.querySelector<HTMLElement>('li[data-step="b"]')?.dataset.state).toBe("current");
	});

	it("useItem and the Item snippet read the enclosing item", async () => {
		await scenario("badge");
		expect(screen.getByTestId("badge-first").element().textContent).toBe("1 current false false");
		expect(screen.getByTestId("badge-third").element().textContent).toBe("3 pending true false");
		expect(screen.getByTestId("arg-first").element().textContent).toBe("current");
	});

	it("keeps an inactive panel mounted and hidden with forceMount", async () => {
		const { container } = await scenario("force");
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
		await full({ snapshot: { step: "third", data: { first: 1 } }, onFinish });
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

	it("a rejecting onFinish leaves the flow unfinished and Next usable, with nothing unhandled", async () => {
		const unhandled = vi.fn();
		window.addEventListener("unhandledrejection", unhandled);
		const onFinish = vi.fn(() => Promise.reject(new Error("Payment declined")));
		const { container } = await full({ snapshot: { step: "third" }, onFinish });
		await userEvent.click(next());
		await new Promise((resolve) => setTimeout(resolve));
		const root = container.querySelector('[data-component="stepper"]');
		expect([root?.hasAttribute("data-finished"), root?.hasAttribute("data-pending")]).toEqual([false, false]);
		expect(next().hasAttribute("aria-disabled")).toBe(false);
		// The user can try again.
		await userEvent.click(next());
		await new Promise((resolve) => setTimeout(resolve));
		expect(onFinish).toHaveBeenCalledTimes(2);
		expect(unhandled).not.toHaveBeenCalled();
		window.removeEventListener("unhandledrejection", unhandled);
	});

	it("disabled on Trigger, Prev and Next blocks them, and arrow keys skip a disabled tab", async () => {
		const { container, rerender } = await parts("disabled", { off: { trigger: true, next: true } });
		const output = () => container.querySelector("output")?.textContent;
		const second = tab("Second");
		expect([second.disabled, second.getAttribute("aria-disabled"), second.hasAttribute("data-disabled")]).toEqual([
			true,
			"true",
			true,
		]);
		await userEvent.click(second, { force: true });
		expect(output()).toBe("first");
		expect([next().disabled, next().getAttribute("aria-disabled")]).toEqual([true, "true"]);
		await userEvent.click(next(), { force: true });
		expect(output()).toBe("first");
		// From the first tab, ArrowRight lands on the third: the second is the application's to block.
		tab("First").focus();
		await userEvent.keyboard("{ArrowRight}");
		expect([output(), document.activeElement]).toEqual(["third", tab("Third")]);
		const back = screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement;
		expect(back.disabled).toBe(false);
		await rerender({ off: { prev: true } });
		expect([back.disabled, second.disabled, next().disabled]).toEqual([true, false, false]);
		await userEvent.click(back, { force: true });
		expect(output()).toBe("third");
	});

	it("follows step, linear and onInvalidStep given to the Root as props", async () => {
		let api!: Api;
		const onInvalidStep = vi.fn();
		const { container, rerender } = await render(Controlled, {
			props: { step: "second", onInvalidStep, ready: (stepper: Api) => (api = stepper) },
		});
		await tick();
		expect(tab("Second").getAttribute("aria-selected")).toBe("true");
		await rerender({ step: "third" });
		await tick();
		expect(tab("Third").getAttribute("aria-selected")).toBe("true");
		await rerender({ step: "nope" });
		await tick();
		expect(onInvalidStep).toHaveBeenCalledWith("third");
		// Turning `linear` on changes the pattern in place: an ordered list of steps, not tabs.
		await rerender({ step: "first" });
		await tick();
		expect(api.current.id).toBe("first");
		await rerender({ linear: true });
		await tick();
		const list = container.querySelector("ol");
		expect(list?.hasAttribute("role")).toBe(false);
		const buttons = container.querySelectorAll<HTMLButtonElement>('[data-component="stepper-trigger"]');
		expect(Array.from(buttons, (button) => [button.getAttribute("aria-current"), button.disabled])).toEqual([
			["step", false],
			[null, true],
			[null, true],
		]);
		await rerender({ linear: false });
		expect(list?.getAttribute("role")).toBe("tablist");
		expect(tab("Third").disabled).toBe(false);
	});

	it("Prev is disabled at the start and returns along the path", async () => {
		await full();
		const back = screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement;
		expect(back.disabled).toBe(true);
		await userEvent.click(next());
		expect(back.disabled).toBe(false);
		await userEvent.click(back);
		expect(screen.getByRole("tab", { name: /First/ }).element().getAttribute("aria-selected")).toBe("true");
	});

	it("respects preventDefault on the buttons and the list", async () => {
		const { container } = await scenario("prevent");
		await userEvent.click(next());
		screen.getByRole("tab", { name: "First" }).element().focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(container.querySelector("output")?.textContent).toBe("first");
	});

	it("the Root snippet follows the flow, and the Root takes your attributes", async () => {
		const { container } = await scenario("slot");
		const root = container.querySelector<HTMLElement>(".mine");
		expect([root?.dataset.extra, root?.dataset.component]).toEqual(["yes", "stepper"]);
		await userEvent.click(next());
		expect(container.querySelector("output")?.textContent).toBe("second");
	});

	it("arrow keys move between tabs, swapped in right-to-left layouts", async () => {
		await scenario("rtl");
		screen.getByRole("tab", { name: /First/ }).element().focus();
		await userEvent.keyboard("{ArrowLeft}");
		const second = screen.getByRole("tab", { name: /Second/ }).element();
		expect(second.getAttribute("aria-selected")).toBe("true");
		expect(document.activeElement).toBe(second);
		await userEvent.keyboard("{End}");
		expect(document.activeElement).toBe(screen.getByRole("tab", { name: /Third/ }).element());
	});

	it("a vertical list moves with up and down, and Home goes to the first tab", async () => {
		const { container } = await parts("vertical");
		const output = () => container.querySelector("output")?.textContent;
		expect(container.querySelector("ol")?.getAttribute("aria-orientation")).toBe("vertical");
		tab("First").focus();
		// Left and right belong to the page in a vertical list.
		await userEvent.keyboard("{ArrowRight}");
		expect(output()).toBe("first");
		await userEvent.keyboard("{ArrowDown}");
		await userEvent.keyboard("{ArrowDown}");
		expect([output(), document.activeElement]).toEqual(["third", tab("Third")]);
		// No wrapping past the end.
		await userEvent.keyboard("{ArrowDown}");
		expect(output()).toBe("third");
		await userEvent.keyboard("{ArrowUp}");
		expect(output()).toBe("second");
		await userEvent.keyboard("{Home}");
		expect([output(), document.activeElement]).toEqual(["first", tab("First")]);
	});
});

describe("focus and announcements", () => {
	it("announces the new step by its title while Next keeps focus", async () => {
		const { container } = await full();
		expect(region(container)?.textContent).toBe("");
		next().focus();
		await userEvent.click(next());
		expect(document.activeElement).toBe(next());
		expect(region(container)?.textContent).toBe("Second");
	});

	it("moves focus to the new panel when the focused element unmounts, without announcing twice", async () => {
		let api!: Api;
		const { container } = await scenario("focus", { ready: (stepper: Api) => (api = stepper) });
		container.querySelector("input")?.focus();
		await api.next();
		flushSync();
		expect(document.activeElement?.textContent).toBe("Two");
		expect(region(container)?.textContent).toBe("");
	});

	it("never moves focus that is outside the stepper", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		let api!: Api;
		await scenario("outside", { ready: (stepper: Api) => (api = stepper) });
		outside.focus();
		await api.next();
		flushSync();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("a running guard keeps the clicked control focusable and marks the stepper busy", async () => {
		let release!: (value: boolean) => void;
		const guard = () =>
			new Promise<boolean>((resolve) => {
				release = resolve;
			});
		const { container } = await full({ guard });
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
		await new Promise((resolve) => setTimeout(resolve));
		flushSync();
		expect(document.activeElement).toBe(second);
		expect(root?.hasAttribute("aria-busy")).toBe(false);
		expect(second.hasAttribute("aria-disabled")).toBe(false);
	});
});

describe("child snippets", () => {
	it("hand ARIA, ids and handlers to your own element", async () => {
		const { container } = await scenario("child");
		expect(container.querySelector("nav")?.dataset.component).toBe("stepper-list");
		expect(container.querySelector<HTMLElement>("nav > div")?.dataset.state).toBe("current");
		expect(container.querySelector("a")?.getAttribute("role")).toBe("tab");
		const button = next();
		expect([button.className, button.dataset.component, button.type]).toEqual(["mine", "stepper-next", "submit"]);
		await userEvent.click(button);
		expect(container.querySelector("output")?.textContent).toBe("second");
	});
});

describe("child snippets on every part", () => {
	it("Content, Indicator, Title and Description hand their attributes to your element", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const { container } = await parts("children");
		await tick();
		await tick();
		const trigger = tab(/First step/);
		const panel = container.querySelector("section");
		expect([panel?.dataset.component, panel?.getAttribute("role"), panel?.className]).toEqual([
			"stepper-content",
			"tabpanel",
			"panel",
		]);
		expect(panel?.getAttribute("aria-labelledby")).toBe(trigger.id);
		expect(trigger.getAttribute("aria-controls")).toBe(panel?.id);
		const mark = container.querySelector("b");
		expect([mark?.dataset.component, mark?.getAttribute("aria-hidden"), mark?.dataset.state]).toEqual([
			"stepper-indicator",
			"true",
			"current",
		]);
		expect(container.querySelector("strong")?.dataset.component).toBe("stepper-title");
		expect(container.querySelector("em")?.dataset.component).toBe("stepper-description");
		expect(warn).not.toHaveBeenCalled();
		warn.mockRestore();
	});
});

describe("elements", () => {
	it("bind:ref gives each part its element, the one a child snippet rendered included, and clears it", async () => {
		let refs: Record<string, Element | null> = {};
		let api!: Api;
		const { container } = await parts("refs", {
			report: (latest: typeof refs) => (refs = latest),
			ready: (stepper: Api) => (api = stepper),
		});
		await tick();
		const tags = Object.fromEntries(Object.entries(refs).map(([part, node]) => [part, node?.localName]));
		expect(tags).toEqual({
			root: "div",
			list: "ol",
			item: "li",
			trigger: "button",
			indicator: "span",
			title: "span",
			description: "span",
			content: "div",
			prev: "button",
			next: "button",
			link: "a",
		});
		expect(refs.root).toBe(container.querySelector('[data-component="stepper"]'));
		expect(refs.trigger).toBe(tab(/First/));
		expect((refs.link as HTMLElement).dataset.component).toBe("stepper-next");
		// The panel of the first step unmounts: its ref goes back to null.
		await api.next();
		await tick();
		expect(refs.content).toBeNull();
		await api.prev();
		await tick();
		expect(refs.content).toBe(container.querySelector('[data-component="stepper-content"]'));
	});

	it("your attachments reach the element, through the default tag or a child snippet", async () => {
		const seen: [string, string][] = [];
		await parts("attach", { attached: (part: string, node: Element) => seen.push([part, node.localName]) });
		await tick();
		expect(seen.sort()).toEqual([
			["content", "div"],
			["next", "a"],
			["root", "div"],
			["trigger", "button"],
		]);
	});
});

describe("nested steppers", () => {
	it("a stepper of another definition inside a panel keeps its own flow, ids, keys and context", async () => {
		let inner!: Api;
		let outer!: { current: { id: string } };
		const { container } = await parts("nested", {
			ready: (stepper: Api) => (inner = stepper),
			outer: (stepper: typeof outer) => (outer = stepper),
		});
		await tick();
		expect([outer.current.id, inner.current.id]).toEqual(["name", "first"]);
		const ids = Array.from(container.querySelectorAll("[id]"), (node) => node.id);
		expect(new Set(ids).size).toBe(ids.length);
		const lists = container.querySelectorAll('[role="tablist"]');
		expect(lists.length).toBe(2);
		// Each tab controls a panel of its own stepper.
		for (const name of ["Name", "First"]) {
			const panel = document.getElementById(tab(name).getAttribute("aria-controls") ?? "");
			expect(panel?.getAttribute("aria-labelledby")).toBe(tab(name).id);
		}
		tab("First").focus();
		await userEvent.keyboard("{ArrowRight}");
		expect([outer.current.id, inner.current.id]).toEqual(["name", "second"]);
		expect(document.activeElement).toBe(tab("Second"));
		await userEvent.click(tab("Done"));
		expect(outer.current.id).toBe("done");
		expect(container.querySelector('[data-testid="inner"]')).toBeNull();
	});

	it("a stepper inside an item of another one does not see that item, its index or its tablist", async () => {
		const { container } = await parts("inside-item");
		await tick();
		const inner = container.querySelector('[data-testid="inner"]');
		// Linear, so a list of steps: not a presentational item of the outer tablist.
		expect(inner?.querySelector("li")?.hasAttribute("role")).toBe(false);
		expect(container.querySelector<HTMLElement>('[data-testid="inner-indicator"]')?.dataset.state).toBe("pending");
		await expect(parts("inner-index")).rejects.toThrow(/SZ101/);
	});
});

describe("development diagnostics", () => {
	async function warnings(name: string) {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await scenario(name);
		await tick();
		await tick();
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		return seen;
	}

	it("warns about a child snippet that drops its props", async () => {
		const seen = await warnings("sz001");
		expect(seen.some((message) => message.includes("SZ001"))).toBe(true);
	});

	it("warns about a trigger without a name or outside a list, with a link", async () => {
		const seen = await warnings("sz002");
		expect(seen.some((message) => message.includes("SZ002") && message.includes("errors#sz002"))).toBe(true);
		expect(seen.some((message) => message.includes("SZ003"))).toBe(true);
	});

	it("throws coded errors outside a Root or an Item, and for unknown steps", async () => {
		await expect(scenario("no-root")).rejects.toThrow(/SZ100/);
		await expect(scenario("no-item")).rejects.toThrow(/SZ101/);
		await expect(scenario("unknown")).rejects.toThrow(/SZ102/);
	});
});

describe("hydration", () => {
	it("keeps the server HTML: nothing changes until the user acts", async () => {
		const container = document.createElement("div");
		container.innerHTML = await commands.renderOnServer({ name: "pair" });
		document.body.appendChild(container);
		expect(container.querySelectorAll('[role="tablist"]').length).toBe(2);
		const ids = Array.from(container.querySelectorAll("[id]"), (node) => node.id);
		expect(new Set(ids).size).toBe(ids.length);
		const attributes = () =>
			Array.from(container.querySelectorAll("*"), (node) =>
				Array.from(node.attributes, (attribute) => `${attribute.name}=${attribute.value}`).join(" "),
			);
		const before = { text: container.textContent, attributes: attributes(), nodes: container.querySelectorAll("*") };
		const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const app = hydrate(Scenario, { target: container, props: { name: "pair" } });
		flushSync();
		await tick();
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
		await unmount(app);
		container.remove();
		warnings.mockRestore();
		errors.mockRestore();
	});
});

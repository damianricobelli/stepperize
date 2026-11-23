import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { flow as definition, type Follower, type Full, type Scenario, type StepOptions, steps } from "./elements";

const mounted: Element[] = [];
afterEach(() => {
	for (const element of mounted.splice(0)) element.remove();
});

/** Put an element on the page with its properties set, and wait for its first render. */
async function mount<E extends Full | Scenario | Follower>(
	tag: string,
	props: Partial<E> = {},
	parent: Element = document.body,
) {
	const element = Object.assign(document.createElement(tag), props) as E;
	parent.appendChild(element);
	mounted.push(element);
	await element.updateComplete;
	// Tabs are decided once the first render has shown which triggers exist.
	await element.updateComplete;
	return element;
}
const full = (options: StepOptions = {}, tag = "sz-full") => mount<Full>(tag, { options });
const scenario = (name: string, props: Partial<Scenario> = {}) => mount<Scenario>("sz-scenario", { name, ...props });
const settle = (element: Full | Scenario | Follower) => element.updateComplete;
/** Let a move, its notification and the update it requests run. */
const flush = async (element: Full | Scenario | Follower) => {
	await new Promise((resolve) => setTimeout(resolve));
	await element.updateComplete;
};
const tabs = (element: Element) =>
	Array.from(root(element).querySelectorAll<HTMLButtonElement>('[data-component="stepper-trigger"]'));
/** Collect the development warnings `run` causes. */
async function warnings(run: () => Promise<unknown>) {
	const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	try {
		await run();
		await new Promise((resolve) => setTimeout(resolve));
		return warn.mock.calls.map((call) => String(call[0]));
	} finally {
		warn.mockRestore();
	}
}

async function violations(node: Element) {
	// `region` is about page landmarks, not a component rendered in isolation.
	const result = await axe.run(node, { rules: { region: { enabled: false } } });
	return result.violations.map(
		(violation) => `${violation.id}: ${violation.nodes.map((entry) => entry.html).join(" | ")}`,
	);
}

const root = (element: Element) => (element.shadowRoot ?? element) as ParentNode & { activeElement?: Element | null };
const next = () => screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
const region = (element: Element) => root(element).querySelector('[data-component="stepper"] > [aria-live="polite"]');

describe("patterns", () => {
	it("a free flow is a tablist: tabs own their panels and axe finds nothing", async () => {
		const element = await full();
		const dom = root(element);
		expect(dom.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(dom.querySelector("li")?.getAttribute("role")).toBe("presentation");
		const tab = screen.getByRole("tab", { name: /First/ }).element();
		expect(tab.getAttribute("aria-selected")).toBe("true");
		expect([tab.getAttribute("aria-posinset"), tab.getAttribute("aria-setsize")]).toEqual(["1", "3"]);
		// The ids resolve inside the shadow root the stepper is rendered in.
		expect(
			element.shadowRoot?.getElementById(tab.getAttribute("aria-controls") ?? "")?.getAttribute("aria-labelledby"),
		).toBe(tab.id);
		expect(await violations(element)).toEqual([]);
		await userEvent.click(next());
		expect(
			screen
				.getByRole("tab", { name: /Second/ })
				.element()
				.getAttribute("aria-selected"),
		).toBe("true");
		expect(
			Array.from(dom.querySelectorAll<HTMLElement>('[data-component="stepper-content"]'), (panel) => panel.hidden),
		).toEqual([true, false, true]);
		expect(await violations(element)).toEqual([]);
	});

	it("works the same in the light DOM", async () => {
		const element = await full({}, "sz-light");
		expect(element.shadowRoot).toBeNull();
		const tab = screen.getByRole("tab", { name: /First/ }).element();
		expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")?.getAttribute("aria-labelledby")).toBe(
			tab.id,
		);
		expect(await violations(element)).toEqual([]);
		element.querySelector("input")?.focus();
		await element.stepper.value.next();
		await settle(element);
		expect(document.activeElement?.getAttribute("data-step")).toBe("second");
	});

	it("a linear flow is an ordered list of steps with aria-current, not tabs", async () => {
		const element = await full({ linear: true });
		const dom = root(element);
		expect(dom.querySelector("ol")?.hasAttribute("role")).toBe(false);
		expect(dom.querySelector("li")?.hasAttribute("role")).toBe(false);
		const buttons = dom.querySelectorAll<HTMLButtonElement>('[data-component="stepper-trigger"]');
		expect(Array.from(buttons, (button) => button.getAttribute("role"))).toEqual([null, null, null]);
		expect(buttons[0].getAttribute("aria-current")).toBe("step");
		// Only next() moves forward, so later steps are unavailable until then.
		expect(Array.from(buttons, (button) => button.disabled)).toEqual([false, true, true]);
		const panel = dom.querySelector('[data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(await violations(element)).toEqual([]);
		await userEvent.click(next());
		expect(buttons[1].getAttribute("aria-current")).toBe("step");
		expect(buttons[0].dataset.state).toBe("complete");
		expect(buttons[0].disabled).toBe(false);
		expect(await violations(element)).toEqual([]);
	});

	it("a flow without triggers has no tabs, and a nested stepper keeps its own parts", async () => {
		const element = await scenario("nested");
		const dom = root(element);
		const inner = dom.querySelector("sz-full") as Full;
		await inner.updateComplete;
		await inner.updateComplete;
		const panel = dom.querySelector('[data-testid="outer"] > [data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(dom.querySelector('[data-testid="outer"] > ol')?.hasAttribute("role")).toBe(false);
		expect(root(inner).querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(await violations(element)).toEqual([]);
		// Pressing the inner Next moves the inner flow only.
		await userEvent.click(next());
		expect(inner.stepper.value.current.id).toBe("second");
		expect(element.stepper.value.current.id).toBe("first");
	});

	it("becomes a tablist when its triggers appear later, and stops when they leave", async () => {
		const element = await scenario("late");
		const list = () => root(element).querySelector("ol");
		expect(list()?.hasAttribute("role")).toBe(false);
		element.show = true;
		await settle(element);
		expect(list()?.getAttribute("role")).toBe("tablist");
		element.show = false;
		await settle(element);
		expect(list()?.hasAttribute("role")).toBe(false);
	});

	it("several steppers on one page get ids of their own", async () => {
		const [a, b] = [await full(), await full()];
		const ids = [a, b].flatMap((element) => Array.from(root(element).querySelectorAll("[id]"), (node) => node.id));
		expect(ids.length).toBe(12);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("state and data attributes", () => {
	it("exposes step, state, validity and reachability for styling and automation", async () => {
		const element = await scenario("checked");
		const dom = root(element);
		const item = dom.querySelector<HTMLElement>('li[data-step="a"]');
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["current", false]);
		expect(await element.checked.value.next("nope")).toMatchObject({ accepted: false, reason: "invalid" });
		await settle(element);
		expect(item?.hasAttribute("data-invalid")).toBe(true);
		expect(dom.querySelector('[data-component="stepper-indicator"]')?.hasAttribute("data-invalid")).toBe(true);
		await element.checked.value.next("ok");
		await settle(element);
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["complete", false]);
		expect(dom.querySelector<HTMLElement>('li[data-step="b"]')?.dataset.state).toBe("current");
	});

	it("`at` reads a step the way its item does", async () => {
		await scenario("badge", { options: { linear: true } });
		expect(screen.getByTestId("badge-first").element().textContent).toBe("1 current false false");
		expect(screen.getByTestId("badge-third").element().textContent).toBe("3 pending true false");
	});

	it("a panel is hidden while its step is not current, or left out of the template", async () => {
		const element = await scenario("panels");
		const panels = () =>
			Array.from(root(element).querySelectorAll<HTMLElement>('[data-component="stepper-content"]'), (panel) => [
				panel.dataset.step,
				panel.hidden,
			]);
		expect(panels()).toEqual([
			["first", false],
			["second", true],
		]);
		await element.stepper.value.goTo("third");
		await settle(element);
		expect(panels()).toEqual([
			["first", true],
			["second", true],
			["third", false],
		]);
	});
});

describe("navigation", () => {
	it("Next finishes the flow on the last step", async () => {
		const onFinish = vi.fn();
		const element = await full({ snapshot: { step: "third", data: { first: 1 } }, onFinish });
		expect(next().disabled).toBe(false);
		await userEvent.click(next());
		expect(onFinish).toHaveBeenCalledWith({ third: undefined }, { first: 1 });
		// Finished: the root says so, and pressing again does not submit twice.
		expect(root(element).querySelector('[data-component="stepper"]')?.hasAttribute("data-finished")).toBe(true);
		expect(next().getAttribute("aria-disabled")).toBe("true");
		await userEvent.click(next(), { force: true });
		expect(onFinish).toHaveBeenCalledTimes(1);
	});

	it("Prev is disabled at the start and returns along the path", async () => {
		await full();
		const back = screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement;
		expect([back.disabled, back.type]).toEqual([true, "button"]);
		await userEvent.click(next());
		expect(back.disabled).toBe(false);
		await userEvent.click(back);
		expect(screen.getByRole("tab", { name: /First/ }).element().getAttribute("aria-selected")).toBe("true");
	});

	it("respects preventDefault from the template's own handlers, and keeps your attributes", async () => {
		const element = await scenario("prevent");
		const stepper = root(element).querySelector<HTMLElement>(".mine");
		expect([stepper?.dataset.extra, stepper?.dataset.component, stepper?.dataset.orientation]).toEqual([
			"yes",
			"stepper",
			"vertical",
		]);
		await userEvent.click(next());
		screen.getByRole("tab", { name: "First" }).element().focus();
		await userEvent.keyboard("{ArrowDown}");
		expect(root(element).querySelector("output")?.textContent).toBe("first");
	});

	it("arrow keys move between tabs, swapped in right-to-left layouts", async () => {
		const wrapper = document.createElement("div");
		wrapper.dir = "rtl";
		document.body.appendChild(wrapper);
		mounted.push(wrapper);
		const element = await mount<Full>("sz-full", {}, wrapper);
		screen.getByRole("tab", { name: /First/ }).element().focus();
		await userEvent.keyboard("{ArrowLeft}");
		await settle(element);
		const second = screen.getByRole("tab", { name: /Second/ }).element();
		expect(second.getAttribute("aria-selected")).toBe("true");
		expect(element.shadowRoot?.activeElement).toBe(second);
		await userEvent.keyboard("{End}");
		await settle(element);
		expect(element.shadowRoot?.activeElement).toBe(screen.getByRole("tab", { name: /Third/ }).element());
	});
});

describe("focus and announcements", () => {
	it("announces the new step by its title while Next keeps focus", async () => {
		const element = await full();
		expect(region(element)?.textContent).toBe("");
		next().focus();
		await userEvent.click(next());
		expect(element.shadowRoot?.activeElement).toBe(next());
		expect(region(element)?.textContent).toBe("Second");
	});

	it("moves focus to the new panel when the focused field is hidden, without announcing twice", async () => {
		const element = await scenario("panels");
		root(element).querySelector("input")?.focus();
		await element.stepper.value.next();
		await settle(element);
		expect(element.shadowRoot?.activeElement?.textContent).toBe("Two");
		expect(region(element)?.textContent).toBe("");
	});

	it("never moves focus that is outside the stepper", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		mounted.push(outside);
		const element = await scenario("panels");
		outside.focus();
		await element.stepper.value.next();
		await settle(element);
		expect(document.activeElement).toBe(outside);
	});

	it("a running guard keeps the clicked control focusable and marks the stepper busy", async () => {
		let release!: (value: boolean) => void;
		const guard = () =>
			new Promise<boolean>((resolve) => {
				release = resolve;
			});
		const element = await full({ guard });
		const stepper = root(element).querySelector('[data-component="stepper"]');
		const second = screen.getByRole("tab", { name: /Second/ }).element() as HTMLButtonElement;
		second.focus();
		await userEvent.click(second);
		expect([stepper?.getAttribute("aria-busy"), stepper?.hasAttribute("data-pending")]).toEqual(["true", true]);
		expect([second.disabled, second.getAttribute("aria-disabled")]).toEqual([false, "true"]);
		expect([next().disabled, next().getAttribute("aria-disabled"), next().hasAttribute("data-pending")]).toEqual([
			false,
			"true",
			true,
		]);
		release(false);
		await new Promise((resolve) => setTimeout(resolve));
		await settle(element);
		expect(element.shadowRoot?.activeElement).toBe(second);
		expect(stepper?.hasAttribute("aria-busy")).toBe(false);
		expect(second.hasAttribute("aria-disabled")).toBe(false);
	});
});

describe("your own elements", () => {
	it("the directives go on any element and keep what you wrote", async () => {
		const element = await scenario("own");
		const dom = root(element);
		expect(dom.querySelector("section")?.getAttribute("role")).toBe("group");
		expect(dom.querySelector("nav")?.dataset.component).toBe("stepper-list");
		const link = dom.querySelector("a");
		expect([link?.getAttribute("role"), link?.getAttribute("href"), link?.hasAttribute("type")]).toEqual([
			"tab",
			"#first",
			false,
		]);
		const button = next();
		expect([button.className, button.dataset.component, button.type]).toEqual(["mine", "stepper-next", "submit"]);
		// `disabled` is an option of the directive, on top of what the flow decides.
		await userEvent.click(button);
		expect((screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement).disabled).toBe(true);
		expect(element.stepper.value.current.id).toBe("second");
	});
});

describe("lifecycle", () => {
	it("stops following the flow while disconnected and catches up when connected again", async () => {
		const element = await full();
		const controller = element.stepper;
		element.remove();
		const updates = vi.spyOn(element, "requestUpdate");
		await controller.flow.next();
		expect(updates).not.toHaveBeenCalled();
		document.body.appendChild(element);
		await settle(element);
		expect(
			screen
				.getByRole("tab", { name: /Second/ })
				.element()
				.getAttribute("aria-selected"),
		).toBe("true");
		// Still interactive after being moved.
		await userEvent.click(next());
		expect(controller.value.current.id).toBe("third");
	});

	it("reads its options again on every update, and `snapshot` once", async () => {
		const seen: string[] = [];
		const element = await full({
			snapshot: { step: "second" },
			onChange: (snapshot) => seen.push(`one:${snapshot.step}`),
		});
		expect(element.stepper.value.current.id).toBe("second");
		element.options = { linear: true, onChange: (snapshot) => seen.push(`two:${snapshot.step}`) };
		await settle(element);
		await settle(element);
		expect(root(element).querySelector("ol")?.hasAttribute("role")).toBe(false);
		await element.stepper.value.next();
		expect(seen).toEqual(["two:third"]);
	});

	it("follows a flow that lives elsewhere without owning it", async () => {
		const { flow: definition } = await import("./elements");
		const shared = definition.create({ snapshot: { step: "second" } });
		const host = await full();
		const follower = definition.controller(host, shared);
		expect(follower.flow).toBe(shared);
		expect(follower.value.current.id).toBe("second");
		const updates = vi.spyOn(host, "requestUpdate");
		follower.hostConnected();
		await shared.next();
		expect(updates).toHaveBeenCalled();
		follower.hostDisconnected();
	});
});

describe("development diagnostics", () => {
	it("warns about a trigger without a name or outside a list, with a link", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await scenario("nameless");
		await new Promise((resolve) => setTimeout(resolve));
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		expect(seen.some((message) => message.includes("SZ002") && message.includes("errors#sz002"))).toBe(true);
		expect(seen.some((message) => message.includes("SZ003"))).toBe(true);
	});

	it("warns about a part rendered outside root(), whose clicks never reach the stepper", async () => {
		const seen = await warnings(async () => {
			await scenario("outside");
		});
		expect(seen.filter((message) => message.includes("SZ100") && message.includes("next() part"))).toHaveLength(1);
		expect(seen.filter((message) => message.includes("content() part"))).toEqual([]);
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
		const element = await full({ snapshot: { step: "third" }, onFinish, guard });
		await userEvent.click(next());
		await vi.waitFor(() => expect(errors).toHaveLength(1));
		expect(String(errors[0])).toMatch(/payment declined/);
		await userEvent.click(screen.getByRole("tab", { name: /First/ }));
		await vi.waitFor(() => expect(errors).toHaveLength(2));
		expect(String(errors[1])).toMatch(/guard broke/);
		await flush(element);
		await userEvent.click(next());
		await vi.waitFor(() => expect(onFinish).toHaveBeenCalledTimes(2));
		spy.mockRestore();
	});

	it("reports coded errors for parts without a root and for unknown steps", async () => {
		const errors: string[] = [];
		const onError = (event: ErrorEvent | PromiseRejectionEvent) => {
			event.preventDefault();
			errors.push(String("reason" in event ? event.reason : event.error));
		};
		window.addEventListener("unhandledrejection", onError);
		window.addEventListener("error", onError);
		for (const name of ["rootless", "unknown"]) {
			const element = Object.assign(document.createElement("sz-scenario"), { name }) as Scenario;
			document.body.appendChild(element);
			mounted.push(element);
			await element.updateComplete.catch((error) => errors.push(String(error)));
		}
		await new Promise((resolve) => setTimeout(resolve));
		window.removeEventListener("unhandledrejection", onError);
		window.removeEventListener("error", onError);
		expect(errors.some((message) => message.includes("SZ100"))).toBe(true);
		expect(errors.some((message) => message.includes("SZ102"))).toBe(true);
	});
});

describe("your attributes", () => {
	it("keeps your name, role and tab stop on the structure, and adds your `disabled` to the flow's", async () => {
		const element = await scenario("authored", { label: "Your details", lock: true });
		const dom = root(element);
		const stepper = dom.querySelector('[data-component="stepper"]');
		expect([stepper?.id, stepper?.getAttribute("role"), stepper?.getAttribute("aria-label")]).toEqual([
			"mine",
			"region",
			"Checkout",
		]);
		expect(dom.querySelector("ol")?.getAttribute("role")).toBe("list");
		expect(dom.querySelector("li")?.getAttribute("role")).toBe("none");
		const [one, two] = dom.querySelectorAll<HTMLElement>('[data-component="stepper-content"]');
		// Your name replaces the stepper's, and both of its ways of naming go.
		expect([one.getAttribute("aria-label"), one.hasAttribute("aria-labelledby"), one.tabIndex]).toEqual([
			"Your details",
			false,
			0,
		]);
		expect(two.getAttribute("aria-labelledby")).toBe(tabs(element)[1].id);
		// The controls keep the stepper's ARIA: they are still tabs.
		expect(tabs(element)[0].getAttribute("role")).toBe("tab");
		// Your `disabled` survives every update of the flow, and shows in ARIA too.
		await element.stepper.value.next();
		await flush(element);
		const [back, forward] = [screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement, next()];
		expect([back.disabled, forward.disabled, forward.getAttribute("aria-disabled")]).toEqual([true, true, "true"]);
		element.lock = false;
		await flush(element);
		expect([back.disabled, forward.disabled, forward.hasAttribute("aria-disabled")]).toEqual([false, false, false]);
		// At the start the flow disables Back on its own.
		await element.stepper.value.prev();
		await flush(element);
		expect(back.disabled).toBe(true);
		// Your name can go away: the stepper's comes back.
		element.label = undefined;
		await flush(element);
		expect([one.hasAttribute("aria-label"), one.getAttribute("aria-labelledby")]).toEqual([false, tabs(element)[0].id]);
	});

	it("removes only what it set: tabs that become a list lose their tab attributes", async () => {
		const element = await full();
		const [first] = tabs(element);
		first.setAttribute("data-mine", "yes");
		element.options = { linear: true };
		await settle(element);
		await settle(element);
		expect([first.hasAttribute("role"), first.hasAttribute("aria-selected"), first.hasAttribute("tabindex")]).toEqual([
			false,
			false,
			false,
		]);
		expect([first.getAttribute("aria-current"), first.dataset.mine]).toEqual(["step", "yes"]);
	});
});

describe("templates", () => {
	it("paints parts that `until` renders later", async () => {
		let resolve!: () => void;
		const element = await scenario("until", { later: new Promise<void>((done) => (resolve = done)) });
		expect(root(element).querySelector("ol")?.hasAttribute("role")).toBe(false);
		resolve();
		await flush(element);
		expect(root(element).querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(tabs(element).map((tab) => tab.getAttribute("aria-selected"))).toEqual(["true", "false", "false"]);
	});

	it("keeps painting parts that `guard` does not render again", async () => {
		const element = await scenario("guard");
		await userEvent.click(next());
		const panels = root(element).querySelectorAll<HTMLElement>('[data-component="stepper-content"]');
		expect(Array.from(panels, (panel) => panel.hidden)).toEqual([true, false]);
		// And after the host is moved, when `guard` still does not render them.
		element.remove();
		document.body.appendChild(element);
		await element.stepper.flow.prev();
		await flush(element);
		expect(Array.from(panels, (panel) => panel.hidden)).toEqual([false, true]);
	});

	it("follows parts that `cache` puts away and brings back", async () => {
		const element = await scenario("cache", { show: true });
		const panel = root(element).querySelector<HTMLElement>('[data-component="stepper-content"]');
		element.show = false;
		await settle(element);
		await element.stepper.value.next();
		await flush(element);
		element.show = true;
		await settle(element);
		expect(root(element).querySelector('[data-component="stepper-content"]')).toBe(panel);
		expect(panel?.hidden).toBe(true);
		await element.stepper.value.prev();
		await flush(element);
		expect(panel?.hidden).toBe(false);
	});

	it("follows the order `repeat` gives the items, for the keyboard too", async () => {
		const element = await scenario("repeat");
		element.order = ["third", "second", "first"];
		await settle(element);
		expect(tabs(element).map((tab) => tab.dataset.step)).toEqual(["third", "second", "first"]);
		tabs(element)[2].focus();
		await userEvent.keyboard("{ArrowLeft}");
		await flush(element);
		expect(element.stepper.value.current.id).toBe("second");
		expect(tabs(element).map((tab) => tab.getAttribute("aria-posinset"))).toEqual(["3", "2", "1"]);
	});

	it("keeps the live region when a trailing child expression of the root changes", async () => {
		const element = await scenario("trailing");
		element.show = true;
		await settle(element);
		element.show = false;
		await settle(element);
		await userEvent.click(next());
		expect(region(element)?.textContent).toBe("Second");
	});

	it("two controllers on one host keep their own ids, flows and keys", async () => {
		const element = await scenario("two");
		const [one, two] = [screen.getByTestId("one").element(), screen.getByTestId("two").element()];
		const ids = (node: Element) => Array.from(node.querySelectorAll("[id]"), (child) => child.id);
		expect(ids(one).some((id) => ids(two).includes(id))).toBe(false);
		await userEvent.click(screen.getByRole("button", { name: "Next" }));
		await flush(element);
		expect([element.stepper.value.current.id, element.other.value.current.id]).toEqual(["first", "second"]);
		(one.querySelector('[role="tab"]') as HTMLElement).focus();
		await userEvent.keyboard("{End}");
		await flush(element);
		expect([element.stepper.value.current.id, element.other.value.current.id]).toEqual(["third", "second"]);
	});
});

describe("keyboard", () => {
	it("a vertical list moves with up and down, and Home and End jump to the edges", async () => {
		const element = await scenario("vertical");
		expect(root(element).querySelector("ol")?.getAttribute("aria-orientation")).toBe("vertical");
		tabs(element)[0].focus();
		await userEvent.keyboard("{ArrowRight}");
		await flush(element);
		expect(element.stepper.value.current.id).toBe("first");
		await userEvent.keyboard("{ArrowDown}");
		await flush(element);
		expect(element.stepper.value.current.id).toBe("second");
		await userEvent.keyboard("{End}");
		await flush(element);
		expect([element.stepper.value.current.id, element.shadowRoot?.activeElement]).toEqual(["third", tabs(element)[2]]);
		await userEvent.keyboard("{Home}");
		await flush(element);
		expect(element.stepper.value.current.id).toBe("first");
		await userEvent.keyboard("{ArrowUp}");
		await flush(element);
		expect(element.stepper.value.current.id).toBe("first");
	});
});

describe("child components", () => {
	it("paints parts of a child component on its first render, and their keys and clicks work", async () => {
		const seen = await warnings(async () => {
			const element = await scenario("child");
			const list = root(element).querySelector("sz-child-list") as Scenario;
			const nav = root(element).querySelector("sz-child-nav") as Scenario;
			await list.updateComplete;
			await nav.updateComplete;
			const back = root(nav).querySelector("button") as HTMLButtonElement;
			expect([back.dataset.component, back.disabled, back.type]).toEqual(["stepper-prev", true, "button"]);
			expect(root(list).querySelector("ol")?.getAttribute("role")).toBe("tablist");
			await userEvent.click(next());
			await flush(element);
			expect(element.stepper.value.current.id).toBe("second");
			// The key comes from inside the child's shadow root: the list still sees which tab it was.
			(root(list).querySelector('button[data-step="second"]') as HTMLElement).focus();
			await userEvent.keyboard("{ArrowRight}");
			await flush(element);
			expect(element.stepper.value.current.id).toBe("third");
			expect(root(list).activeElement?.getAttribute("data-step")).toBe("third");
		});
		// Tabs and panels name each other by id, which cannot cross shadow roots: that is reported.
		expect(seen.filter((message) => message.includes("SZ004")).length).toBe(3);
		expect(seen.some((message) => message.includes('trigger() part of step "first"'))).toBe(true);
	});

	it("a trigger a child component renders inside the List is inside it, across the shadow root", async () => {
		const seen = await warnings(async () => {
			const element = await scenario("child-trigger");
			for (const child of root(element).querySelectorAll("sz-child-trigger")) await (child as Scenario).updateComplete;
			await flush(element);
			expect(root(element).querySelector("ol")?.getAttribute("role")).toBe("tablist");
		});
		expect(seen.filter((message) => message.includes("SZ003"))).toEqual([]);
	});
});

describe("following", () => {
	it("renders a linear flow it follows as a list, not tabs", async () => {
		const element = await mount<Follower>("sz-follower", {
			flow: definition.create({ linear: true }),
		});
		expect(root(element).querySelector("ol")?.hasAttribute("role")).toBe(false);
		expect(tabs(element)[0].getAttribute("aria-current")).toBe("step");
	});

	it("follows a flow that arrives later or changes, and leaves the one it replaces alone", async () => {
		const element = await mount<Follower>("sz-follower");
		// Until a flow arrives, the host shows one of its own.
		const own = vi.spyOn(element.stepper.flow, "destroy");
		expect(root(element).querySelector("output")?.textContent).toBe("first");
		const first = definition.create({ snapshot: { step: "second" } });
		element.flow = first;
		await settle(element);
		expect(element.stepper.flow).toBe(first);
		expect(root(element).querySelector("output")?.textContent).toBe("second");
		// The flow the host owned until then is destroyed; the one it followed is not.
		const destroy = vi.spyOn(first, "destroy");
		const second = definition.create({ snapshot: { step: "third" } });
		element.flow = second;
		await settle(element);
		expect(root(element).querySelector("output")?.textContent).toBe("third");
		expect(destroy).not.toHaveBeenCalled();
		expect(own).toHaveBeenCalledTimes(1);
		// Only the current flow updates the host, and a new flow announces nothing.
		const renders = element.renders;
		await first.next();
		await flush(element);
		expect(element.renders).toBe(renders);
		expect(region(element)?.textContent).toBe("");
		await second.goTo("first");
		await flush(element);
		expect(root(element).querySelector("output")?.textContent).toBe("first");
		expect(region(element)?.textContent).toBe("First");
	});
});

describe("updates", () => {
	it("follows `step` in the same render, without a second update or a warning", async () => {
		const seen = await warnings(async () => {
			const element = await full({ step: "first" });
			const renders = element.renders;
			element.options = { step: "third" };
			await settle(element);
			expect(element.renders).toBe(renders + 1);
			expect(tabs(element)[2].getAttribute("aria-selected")).toBe("true");
			await settle(element);
			expect(element.renders).toBe(renders + 1);
		});
		expect(seen.filter((message) => message.includes("change-in-update"))).toEqual([]);
	});
});

describe("destroy", () => {
	it("cancels a running move of a flow the host owns, and stops updating the host", async () => {
		let release!: (value: boolean) => void;
		const element = await full({ guard: () => new Promise<boolean>((resolve) => (release = resolve)) });
		const moving = element.stepper.flow.next();
		await flush(element);
		expect(element.stepper.value.isPending).toBe(true);
		const renders = element.renders;
		element.stepper.destroy();
		release(true);
		expect(await moving).toEqual({ accepted: false, reason: "cancelled" });
		element.requestUpdate();
		await flush(element);
		// Gone from the host: its update no longer repaints the parts, and clicks do nothing.
		expect(element.renders).toBe(renders + 1);
		next().click();
		await flush(element);
		expect(element.stepper.value.current.id).toBe("first");
		expect(region(element)).toBeNull();
	});

	it("leaves a flow it follows running", async () => {
		const shared = definition.create();
		const element = await mount<Follower>("sz-follower", { flow: shared });
		element.stepper.destroy();
		expect(await shared.next()).toMatchObject({ accepted: true });
	});

	it("a host removed while a move runs shows its result when it comes back, without announcing it", async () => {
		let release!: (value: boolean) => void;
		const element = await full({ guard: () => new Promise<boolean>((resolve) => (release = resolve)) });
		next().focus();
		await userEvent.click(next());
		element.remove();
		release(true);
		await flush(element);
		expect(element.stepper.value.current.id).toBe("second");
		document.body.appendChild(element);
		await flush(element);
		expect(tabs(element)[1].getAttribute("aria-selected")).toBe("true");
		expect(region(element)?.textContent).toBe("");
		await userEvent.click(next());
		release(true);
		await flush(element);
		expect(region(element)?.textContent).toBe("Third");
	});

	it("clears the announcement when the flow finishes", async () => {
		const element = await full();
		await userEvent.click(next());
		expect(region(element)?.textContent).toBe("Second");
		await element.stepper.value.goTo("third");
		await flush(element);
		await userEvent.click(next());
		await flush(element);
		expect(element.stepper.value.isFinished).toBe(true);
		expect(region(element)?.textContent).toBe("");
	});
});

it("types the steps of the scenarios", () => {
	expect(steps.length).toBe(3);
});

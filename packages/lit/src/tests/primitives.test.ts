import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { type Full, type Scenario, type StepOptions, steps } from "./elements";

const mounted: Element[] = [];
afterEach(() => {
	for (const element of mounted.splice(0)) element.remove();
});

/** Put an element on the page with its properties set, and wait for its first render. */
async function mount<E extends Full | Scenario>(tag: string, props: Partial<E> = {}, parent: Element = document.body) {
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
const settle = (element: Full | Scenario) => element.updateComplete;

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

it("types the steps of the scenarios", () => {
	expect(steps.length).toBe(3);
});

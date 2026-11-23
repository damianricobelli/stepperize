import type { ComponentRef, Type } from "@angular/core";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { Full, Scenario, type StepOptions } from "./fixtures";

afterEach(() => TestBed.resetTestingModule());

/** Render a component into the page with its inputs set, and wait until it is stable. */
async function mount<C>(component: Type<C>, inputs: Record<string, unknown> = {}, host: HTMLElement = document.body) {
	const fixture = TestBed.createComponent(component) as ComponentFixture<C>;
	host.appendChild(fixture.nativeElement);
	for (const [name, value] of Object.entries(inputs)) (fixture.componentRef as ComponentRef<C>).setInput(name, value);
	await fixture.whenStable();
	return fixture;
}
const full = (options: StepOptions = {}) => mount(Full, { options });
const scenario = (name: string, options: StepOptions = {}) => mount(Scenario, { name, options });

async function violations(node: Element) {
	// `region` is about page landmarks, not a component rendered in isolation.
	const result = await axe.run(node, { rules: { region: { enabled: false } } });
	return result.violations.map(
		(violation) => `${violation.id}: ${violation.nodes.map((entry) => entry.html).join(" | ")}`,
	);
}

const next = () => screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
const region = (container: Element) => container.querySelector('[data-component="stepper"] > [aria-live="polite"]');

describe("patterns", () => {
	it("a free flow is a tablist: tabs own their panels and axe finds nothing", async () => {
		const fixture = await full();
		const container: HTMLElement = fixture.nativeElement;
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(container.querySelector("li")?.getAttribute("role")).toBe("presentation");
		const tab = screen.getByRole("tab", { name: /First/ }).element();
		expect(tab.getAttribute("aria-selected")).toBe("true");
		expect([tab.getAttribute("aria-posinset"), tab.getAttribute("aria-setsize")]).toEqual(["1", "3"]);
		expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")?.getAttribute("aria-labelledby")).toBe(
			tab.id,
		);
		expect(await violations(container)).toEqual([]);
		await userEvent.click(next());
		await fixture.whenStable();
		expect(
			screen
				.getByRole("tab", { name: /Second/ })
				.element()
				.getAttribute("aria-selected"),
		).toBe("true");
		expect(
			Array.from(
				container.querySelectorAll<HTMLElement>('[data-component="stepper-content"]'),
				(panel) => panel.hidden,
			),
		).toEqual([true, false, true]);
		expect(await violations(container)).toEqual([]);
	});

	it("a linear flow is an ordered list of steps with aria-current, not tabs", async () => {
		const fixture = await full({ linear: true });
		const container: HTMLElement = fixture.nativeElement;
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		expect(container.querySelector("li")?.hasAttribute("role")).toBe(false);
		const buttons = container.querySelectorAll<HTMLButtonElement>('[data-component="stepper-trigger"]');
		expect(Array.from(buttons, (button) => button.getAttribute("role"))).toEqual([null, null, null]);
		expect(Array.from(buttons, (button) => button.hasAttribute("tabindex"))).toEqual([false, false, false]);
		expect(buttons[0].getAttribute("aria-current")).toBe("step");
		// Only next() moves forward, so later steps are unavailable until then.
		expect(Array.from(buttons, (button) => button.disabled)).toEqual([false, true, true]);
		const panel = container.querySelector('[data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(await violations(container)).toEqual([]);
		await userEvent.click(next());
		await fixture.whenStable();
		expect(buttons[1].getAttribute("aria-current")).toBe("step");
		expect(buttons[0].dataset.state).toBe("complete");
		expect(buttons[0].disabled).toBe(false);
		expect(await violations(container)).toEqual([]);
	});

	it("a flow without triggers has no tabs, and a nested stepper keeps its own parts", async () => {
		const fixture = await scenario("nested");
		const container: HTMLElement = fixture.nativeElement;
		const panel = container.querySelector('[data-testid="outer"] > [data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(container.querySelector('[data-testid="outer"] > ol')?.hasAttribute("role")).toBe(false);
		expect(container.querySelector("sz-full ol")?.getAttribute("role")).toBe("tablist");
		expect(container.querySelectorAll('[role="tabpanel"]').length).toBe(3);
		expect(await violations(container)).toEqual([]);
		// Pressing the inner Next moves the inner flow only.
		await userEvent.click(next());
		await fixture.whenStable();
		expect(container.querySelector('sz-full [aria-selected="true"]')?.textContent).toContain("Second");
		expect(fixture.componentInstance.stepper().current.id).toBe("first");
	});

	it("becomes a tablist when its triggers appear later, and stops when they leave", async () => {
		const fixture = await scenario("late");
		const list = () => (fixture.nativeElement as HTMLElement).querySelector("ol");
		expect(list()?.hasAttribute("role")).toBe(false);
		fixture.componentInstance.show.set(true);
		await fixture.whenStable();
		expect(list()?.getAttribute("role")).toBe("tablist");
		fixture.componentInstance.show.set(false);
		await fixture.whenStable();
		expect(list()?.hasAttribute("role")).toBe(false);
	});

	it("several steppers on one page get ids of their own", async () => {
		const fixtures = [await full(), await full()];
		const ids = fixtures.flatMap((fixture) =>
			Array.from((fixture.nativeElement as HTMLElement).querySelectorAll("[id]"), (node) => node.id),
		);
		expect(ids.length).toBe(12);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("state and data attributes", () => {
	it("exposes step, state, validity and reachability for styling and automation", async () => {
		const fixture = await scenario("checked");
		const container: HTMLElement = fixture.nativeElement;
		const api = fixture.componentInstance.checked;
		const item = container.querySelector<HTMLElement>('li[data-step="a"]');
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["current", false]);
		expect(await api().next("nope")).toMatchObject({ accepted: false, reason: "invalid" });
		await fixture.whenStable();
		expect(item?.hasAttribute("data-invalid")).toBe(true);
		expect(container.querySelector('[data-component="stepper-indicator"]')?.hasAttribute("data-invalid")).toBe(true);
		await api().next("ok");
		await fixture.whenStable();
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["complete", false]);
		expect(container.querySelector<HTMLElement>('li[data-step="b"]')?.dataset.state).toBe("current");
	});

	it("an item exports what it knows about its step", async () => {
		await scenario("badge", { linear: true });
		const text = (id: string) => screen.getByTestId(id).element().textContent?.replace(/\s+/g, " ").trim();
		expect(text("badge-first")).toBe("1 current false false");
		expect(text("badge-third")).toBe("3 pending true false");
	});

	it("a panel is hidden while its step is not current, or left out with @if", async () => {
		const fixture = await scenario("panels");
		const panels = () =>
			Array.from(
				(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[data-component="stepper-content"]'),
				(panel) => [panel.dataset.step, panel.hidden],
			);
		expect(panels()).toEqual([
			["first", false],
			["second", true],
		]);
		await fixture.componentInstance.stepper().goTo("third");
		await fixture.whenStable();
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
		const fixture = await full({ snapshot: { step: "third", data: { first: 1 } }, onFinish });
		expect(next().disabled).toBe(false);
		await userEvent.click(next());
		await fixture.whenStable();
		expect(onFinish).toHaveBeenCalledWith({ third: undefined }, { first: 1 });
		// Finished: the root says so, and pressing again does not submit twice.
		const root = (fixture.nativeElement as HTMLElement).querySelector('[data-component="stepper"]');
		expect(root?.hasAttribute("data-finished")).toBe(true);
		expect(next().getAttribute("aria-disabled")).toBe("true");
		await userEvent.click(next(), { force: true });
		expect(onFinish).toHaveBeenCalledTimes(1);
	});

	it("Prev is disabled at the start and returns along the path", async () => {
		const fixture = await full();
		const back = screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement;
		expect([back.disabled, back.type]).toEqual([true, "button"]);
		await userEvent.click(next());
		await fixture.whenStable();
		expect(back.disabled).toBe(false);
		await userEvent.click(back);
		await fixture.whenStable();
		expect(screen.getByRole("tab", { name: /First/ }).element().getAttribute("aria-selected")).toBe("true");
	});

	it("respects preventDefault from the template's own handlers, and keeps your attributes", async () => {
		const fixture = await scenario("prevent");
		const container: HTMLElement = fixture.nativeElement;
		const root = container.querySelector<HTMLElement>(".mine");
		expect([
			root?.dataset.extra,
			root?.dataset.component,
			root?.dataset.orientation,
			root?.getAttribute("aria-label"),
		]).toEqual(["yes", "stepper", "vertical", "Checkout"]);
		await userEvent.click(next());
		screen.getByRole("tab", { name: "First" }).element().focus();
		await userEvent.keyboard("{ArrowDown}");
		await fixture.whenStable();
		expect(container.querySelector("output")?.textContent).toBe("first");
	});

	it("arrow keys move between tabs, swapped in right-to-left layouts", async () => {
		const wrapper = document.createElement("div");
		wrapper.dir = "rtl";
		document.body.appendChild(wrapper);
		const fixture = await mount(Full, {}, wrapper);
		screen.getByRole("tab", { name: /First/ }).element().focus();
		await userEvent.keyboard("{ArrowLeft}");
		await fixture.whenStable();
		const second = screen.getByRole("tab", { name: /Second/ }).element();
		expect(second.getAttribute("aria-selected")).toBe("true");
		expect(document.activeElement).toBe(second);
		await userEvent.keyboard("{End}");
		await fixture.whenStable();
		expect(document.activeElement).toBe(screen.getByRole("tab", { name: /Third/ }).element());
		wrapper.remove();
	});
});

describe("focus and announcements", () => {
	it("announces the new step by its title while Next keeps focus", async () => {
		const fixture = await full();
		expect(region(fixture.nativeElement)?.textContent).toBe("");
		next().focus();
		await userEvent.click(next());
		await fixture.whenStable();
		expect(document.activeElement).toBe(next());
		expect(region(fixture.nativeElement)?.textContent).toBe("Second");
	});

	it("moves focus to the new panel when the focused field is hidden, without announcing twice", async () => {
		const fixture = await scenario("panels");
		(fixture.nativeElement as HTMLElement).querySelector("input")?.focus();
		await fixture.componentInstance.stepper().next();
		await fixture.whenStable();
		expect(document.activeElement?.textContent).toBe("Two");
		expect(region(fixture.nativeElement)?.textContent).toBe("");
	});

	it("never moves focus that is outside the stepper", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const fixture = await scenario("panels");
		outside.focus();
		await fixture.componentInstance.stepper().next();
		await fixture.whenStable();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("a running guard keeps the clicked control focusable and marks the stepper busy", async () => {
		let release!: (value: boolean) => void;
		const guard = () =>
			new Promise<boolean>((resolve) => {
				release = resolve;
			});
		const fixture = await full({ guard });
		const root = (fixture.nativeElement as HTMLElement).querySelector('[data-component="stepper"]');
		const second = screen.getByRole("tab", { name: /Second/ }).element() as HTMLButtonElement;
		second.focus();
		await userEvent.click(second);
		await fixture.whenStable();
		expect([root?.getAttribute("aria-busy"), root?.hasAttribute("data-pending")]).toEqual(["true", true]);
		expect([second.disabled, second.getAttribute("aria-disabled")]).toEqual([false, "true"]);
		expect([next().disabled, next().getAttribute("aria-disabled"), next().hasAttribute("data-pending")]).toEqual([
			false,
			"true",
			true,
		]);
		release(false);
		await new Promise((resolve) => setTimeout(resolve));
		await fixture.whenStable();
		expect(document.activeElement).toBe(second);
		expect(root?.hasAttribute("aria-busy")).toBe(false);
		expect(second.hasAttribute("aria-disabled")).toBe(false);
	});
});

describe("your own elements", () => {
	it("the directives go on any element and keep what you wrote", async () => {
		const fixture = await scenario("own");
		const container: HTMLElement = fixture.nativeElement;
		expect(container.querySelector("section")?.getAttribute("role")).toBe("group");
		expect(container.querySelector("nav")?.dataset.component).toBe("stepper-list");
		const [first, second] = Array.from(container.querySelectorAll("a"));
		expect([first.getAttribute("role"), first.getAttribute("href"), first.hasAttribute("type")]).toEqual([
			"tab",
			"#first",
			false,
		]);
		// A trigger outside an item names its step itself.
		expect(second.dataset.step).toBe("second");
		const button = next();
		expect([button.className, button.dataset.component, button.type]).toEqual(["mine", "stepper-next", "submit"]);
		await userEvent.click(button);
		await fixture.whenStable();
		// `disabled` is an input of the directive, on top of what the flow decides.
		expect((screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement).disabled).toBe(true);
		expect(fixture.componentInstance.stepper().current.id).toBe("second");
	});
});

describe("lifecycle", () => {
	it("destroys the flow with its component", async () => {
		const fixture = await full();
		const { flow } = fixture.componentInstance.stepper;
		const changes = vi.fn();
		flow.subscribe(changes);
		fixture.destroy();
		await flow.next();
		// `destroy()` dropped every listener, this one included.
		expect(changes).not.toHaveBeenCalled();
	});
});

describe("diagnostics", () => {
	it("warns about a trigger without a name or outside a list, with a link", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await scenario("nameless");
		await new Promise((resolve) => setTimeout(resolve));
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		expect(seen.some((message) => message.includes("SZ002") && message.includes("errors#sz002"))).toBe(true);
		expect(seen.some((message) => message.includes("SZ003"))).toBe(true);
	});

	it("throws coded errors outside a root or an item, and for unknown steps", async () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		await expect(scenario("rootless")).rejects.toThrow(/SZ100/);
		await expect(scenario("itemless")).rejects.toThrow(/SZ101/);
		await expect(scenario("unknown")).rejects.toThrow(/SZ102/);
		error.mockRestore();
	});
});

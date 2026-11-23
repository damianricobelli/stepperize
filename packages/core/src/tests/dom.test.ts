import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { bindStepper } from "../dom";
import { createStepper } from "../stepper";
import type { Options } from "../types";

const steps = [
	{ id: "first", title: "First", description: "Start here" },
	{ id: "second", title: "Second", description: "Then this" },
	{ id: "third", title: "Third", description: "Finish" },
] as const;

/** What a server template would render: every panel is in the HTML. */
const markup = (attributes = "") => `
<div data-component="stepper" ${attributes}>
	<ol data-component="stepper-list">
		${steps
			.map(
				(step) => `
		<li data-component="stepper-item" data-step="${step.id}">
			<button data-component="stepper-trigger">
				<span data-component="stepper-indicator"></span>
				<span data-component="stepper-title">${step.title}</span>
				<span data-component="stepper-description"></span>
			</button>
		</li>`,
			)
			.join("")}
	</ol>
	${steps
		.map(
			(step) => `
	<div data-component="stepper-content" data-step="${step.id}">
		<label>${step.title} name <input /></label>
	</div>`,
		)
		.join("")}
	<button data-component="stepper-prev">Back</button>
	<button data-component="stepper-next">Continue</button>
</div>`;

const cleanups: (() => void)[] = [];
afterEach(() => {
	for (const cleanup of cleanups.splice(0)) cleanup();
});

/** Put HTML on the page, as a server would have, then bind every stepper in it. */
function serve(html: string, options: Options<typeof steps> & { bind?: boolean } = {}) {
	const container = document.createElement("div");
	container.innerHTML = html;
	document.body.appendChild(container);
	const flow = createStepper(steps, options);
	const root = container.querySelector<HTMLElement>('[data-component="stepper"]') as HTMLElement;
	const unbind = options.bind === false ? () => {} : bindStepper(root, flow, { linear: options.linear });
	cleanups.push(() => {
		unbind();
		container.remove();
	});
	return { container, root, flow, unbind };
}

async function violations(node: Element) {
	// `region` is about page landmarks, not a component rendered in isolation.
	const result = await axe.run(node, { rules: { region: { enabled: false } } });
	return result.violations.map(
		(violation) => `${violation.id}: ${violation.nodes.map((entry) => entry.html).join(" | ")}`,
	);
}

const next = () => screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
const region = (root: Element) => root.querySelector(':scope > [aria-live="polite"]');
const panels = (root: Element) =>
	Array.from(root.querySelectorAll<HTMLElement>(':scope > [data-component="stepper-content"]'));

describe("patterns", () => {
	it("a free flow is a tablist: tabs own their panels and axe finds nothing", async () => {
		const { container, root } = serve(markup());
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(container.querySelector("li")?.getAttribute("role")).toBe("presentation");
		const tab = screen.getByRole("tab", { name: /First/ }).element();
		expect(tab.getAttribute("aria-selected")).toBe("true");
		expect([tab.getAttribute("aria-posinset"), tab.getAttribute("aria-setsize")]).toEqual(["1", "3"]);
		expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")?.getAttribute("aria-labelledby")).toBe(
			tab.id,
		);
		// Every panel came from the server: the ones that are not current are hidden, not removed.
		expect(panels(root).map((panel) => panel.hidden)).toEqual([false, true, true]);
		expect(await violations(container)).toEqual([]);
		await userEvent.click(next());
		expect(
			screen
				.getByRole("tab", { name: /Second/ })
				.element()
				.getAttribute("aria-selected"),
		).toBe("true");
		expect(panels(root).map((panel) => panel.hidden)).toEqual([true, false, true]);
		expect(await violations(container)).toEqual([]);
	});

	it("a linear flow is an ordered list of steps with aria-current, not tabs", async () => {
		const { container } = serve(markup(), { linear: true });
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

	it("reads `data-linear` and `data-orientation` from the markup", () => {
		const container = document.createElement("div");
		container.innerHTML = markup('data-linear data-orientation="vertical"');
		document.body.appendChild(container);
		const root = container.firstElementChild as HTMLElement;
		const unbind = bindStepper(root, createStepper(steps, { linear: true }));
		cleanups.push(() => {
			unbind();
			container.remove();
		});
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		expect([root.dataset.orientation, container.querySelector("ol")?.dataset.orientation]).toEqual([
			"vertical",
			"vertical",
		]);
	});

	it("a flow without triggers has no tabs, and a nested stepper keeps its own parts", async () => {
		const { container, root } = serve(`
<div data-component="stepper" data-testid="outer">
	<ol data-component="stepper-list">
		${steps.map((step) => `<li data-component="stepper-item" data-step="${step.id}"><span data-component="stepper-indicator"></span></li>`).join("")}
	</ol>
	<div data-component="stepper-content" data-step="first">${markup('id="inner"')}</div>
</div>`);
		const inner = container.querySelector<HTMLElement>("#inner") as HTMLElement;
		cleanups.push(bindStepper(inner, createStepper(steps)));
		const panel = root.querySelector(':scope > [data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(root.querySelector(":scope > ol")?.hasAttribute("role")).toBe(false);
		// The inner stepper is a tablist of its own, with ids from its own `id`.
		expect(inner.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(inner.querySelector('[role="tab"]')?.id).toBe("inner-trigger-first");
		expect(container.querySelectorAll('[role="tabpanel"]').length).toBe(3);
		expect(await violations(container)).toEqual([]);
		// Pressing the inner Next moves the inner flow only.
		await userEvent.click(next());
		expect(inner.querySelector('[aria-selected="true"]')?.textContent).toContain("Second");
		expect(panel?.hasAttribute("hidden")).toBe(false);
	});

	it("several steppers on one page get ids of their own", () => {
		const a = serve(markup());
		const b = serve(markup());
		const ids = [a.container, b.container].flatMap((container) =>
			Array.from(container.querySelectorAll("[id]"), (node) => node.id),
		);
		expect(ids.length).toBe(12);
		expect(new Set(ids).size).toBe(ids.length);
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
		const flow = createStepper([
			{ id: "a", title: "A", schema },
			{ id: "b", title: "B" },
		]);
		const container = document.createElement("div");
		container.innerHTML = `
<div data-component="stepper">
	<ol data-component="stepper-list">
		<li data-component="stepper-item" data-step="a"><button data-component="stepper-trigger"><span data-component="stepper-indicator"></span><span data-component="stepper-title"></span></button></li>
		<li data-component="stepper-item" data-step="b"><button data-component="stepper-trigger"><span data-component="stepper-title"></span></button></li>
	</ol>
</div>`;
		document.body.appendChild(container);
		const unbind = bindStepper(container.firstElementChild as HTMLElement, flow);
		cleanups.push(() => {
			unbind();
			container.remove();
		});
		// An empty title is filled in from the step.
		expect(screen.getByRole("tab", { name: "A" }).element().getAttribute("aria-selected")).toBe("true");
		const item = container.querySelector<HTMLElement>('li[data-step="a"]');
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["current", false]);
		expect(await flow.next("nope")).toMatchObject({ accepted: false, reason: "invalid" });
		expect(item?.hasAttribute("data-invalid")).toBe(true);
		expect(container.querySelector('[data-component="stepper-indicator"]')?.hasAttribute("data-invalid")).toBe(true);
		await flow.next("ok");
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["complete", false]);
		expect(container.querySelector<HTMLElement>('li[data-step="b"]')?.dataset.state).toBe("current");
	});

	it("keeps a name the page gave the stepper", () => {
		const { root } = serve(markup('aria-label="Checkout"'));
		expect([root.getAttribute("role"), root.getAttribute("aria-label")]).toEqual(["group", "Checkout"]);
		expect(serve(markup()).root.getAttribute("aria-label")).toBe("Stepper");
	});

	it("throws coded errors for a part without a step and for an unknown step", () => {
		const unknown = '<div data-component="stepper"><div data-component="stepper-content" data-step="nope"></div></div>';
		const missing = '<div data-component="stepper"><div data-component="stepper-content"></div></div>';
		expect(() => serve(unknown)).toThrow(/SZ102/);
		expect(() => serve(missing)).toThrow(/SZ101/);
	});

	it("reports markup that goes bad later without breaking the flow", async () => {
		const { root, flow } = serve(markup());
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const seen = vi.fn();
		flow.subscribe(seen);
		root.insertAdjacentHTML("beforeend", '<div data-component="stepper-content" data-step="typo"></div>');
		await expect(flow.next()).resolves.toMatchObject({ accepted: true });
		expect(seen).toHaveBeenCalled();
		expect(String(error.mock.calls[0]?.[0])).toMatch(/SZ102/);
		error.mockRestore();
	});

	it("replaces the previous binding when the same root is bound again", async () => {
		const { root, flow } = serve(markup());
		cleanups.push(bindStepper(root, flow));
		next().click();
		await vi.waitFor(() => expect(flow.index).toBe(1));
		expect(root.querySelectorAll(':scope > [aria-live="polite"]')).toHaveLength(1);
	});

	it("ignores arrow keys pressed with a modifier", () => {
		const { root } = serve(markup());
		const tab = root.querySelector<HTMLElement>('[role="tab"]');
		const event = new KeyboardEvent("keydown", { key: "ArrowRight", altKey: true, bubbles: true, cancelable: true });
		tab?.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
	});

	it("leaves nothing behind when the markup cannot be bound", async () => {
		const { root, flow } = serve(
			'<div data-component="stepper"><div data-component="stepper-content" data-step="nope"></div></div>',
			{ bind: false },
		);
		expect(() => bindStepper(root, flow)).toThrow(/SZ102/);
		expect(region(root)).toBeNull();
		// The flow is not followed by a binding that never finished: moving it does not throw.
		await expect(flow.next()).resolves.toMatchObject({ accepted: true });
	});
});

describe("navigation", () => {
	it("Next finishes the flow on the last step", async () => {
		const onFinish = vi.fn();
		const { root } = serve(markup(), { snapshot: { step: "third", data: { first: 1 } }, onFinish });
		expect(next().disabled).toBe(false);
		await userEvent.click(next());
		expect(onFinish).toHaveBeenCalledWith({ third: undefined }, { first: 1 });
		// Finished: the root says so, and pressing again does not submit twice.
		expect(root.hasAttribute("data-finished")).toBe(true);
		expect(next().getAttribute("aria-disabled")).toBe("true");
		await userEvent.click(next(), { force: true });
		expect(onFinish).toHaveBeenCalledTimes(1);
	});

	it("Prev is disabled at the start and returns along the path", async () => {
		serve(markup());
		const back = screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement;
		expect([back.disabled, back.type, next().type]).toEqual([true, "button", "button"]);
		await userEvent.click(next());
		expect(back.disabled).toBe(false);
		await userEvent.click(back);
		expect(screen.getByRole("tab", { name: /First/ }).element().getAttribute("aria-selected")).toBe("true");
	});

	it("respects preventDefault from the page's own handlers", async () => {
		const { container, flow } = serve(markup());
		next().addEventListener("click", (event) => event.preventDefault());
		container.querySelector("ol")?.addEventListener("keydown", (event) => event.preventDefault());
		await userEvent.click(next());
		screen.getByRole("tab", { name: /First/ }).element().focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(flow.current.id).toBe("first");
	});

	it("arrow keys move between tabs, swapped in right-to-left layouts", async () => {
		serve(`<div dir="rtl">${markup()}</div>`);
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
		const { root } = serve(markup());
		expect(region(root)?.textContent).toBe("");
		next().focus();
		await userEvent.click(next());
		expect(document.activeElement).toBe(next());
		expect(region(root)?.textContent).toBe("Second");
	});

	it("moves focus to the new panel when the focused field is hidden, without announcing twice", async () => {
		const { root, flow } = serve(markup());
		root.querySelector("input")?.focus();
		await flow.next();
		expect(document.activeElement).toBe(panels(root)[1]);
		expect(region(root)?.textContent).toBe("");
	});

	it("never moves focus that is outside the stepper", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { flow } = serve(markup());
		outside.focus();
		await flow.next();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("a running guard keeps the clicked control focusable and marks the stepper busy", async () => {
		let release!: (value: boolean) => void;
		const guard = () =>
			new Promise<boolean>((resolve) => {
				release = resolve;
			});
		const { root } = serve(markup(), { guard });
		const second = screen.getByRole("tab", { name: /Second/ }).element() as HTMLButtonElement;
		second.focus();
		await userEvent.click(second);
		expect([root.getAttribute("aria-busy"), root.hasAttribute("data-pending")]).toEqual(["true", true]);
		expect([second.disabled, second.getAttribute("aria-disabled")]).toEqual([false, "true"]);
		expect([next().disabled, next().getAttribute("aria-disabled"), next().hasAttribute("data-pending")]).toEqual([
			false,
			"true",
			true,
		]);
		release(false);
		await new Promise((resolve) => setTimeout(resolve));
		expect(document.activeElement).toBe(second);
		expect(root.hasAttribute("aria-busy")).toBe(false);
		expect(second.hasAttribute("aria-disabled")).toBe(false);
	});
});

describe("the page changes", () => {
	it("markup swapped in later becomes part of the stepper", async () => {
		const { root, flow } = serve(`
<div data-component="stepper">
	<div data-component="stepper-content" data-step="first">One</div>
	<div data-component="stepper-content" data-step="second">Two</div>
</div>`);
		expect(panels(root)[0].getAttribute("role")).toBe("group");
		// What an htmx swap or an Alpine template does: new elements, no new binding.
		root.insertAdjacentHTML(
			"afterbegin",
			`<ol data-component="stepper-list">${steps.map((step) => `<li data-component="stepper-item" data-step="${step.id}"><button data-component="stepper-trigger">${step.title}</button></li>`).join("")}</ol>`,
		);
		root.insertAdjacentHTML("beforeend", '<button data-component="stepper-next">Continue</button>');
		await new Promise((resolve) => setTimeout(resolve));
		expect(root.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(panels(root)[0].getAttribute("role")).toBe("tabpanel");
		await userEvent.click(next());
		expect(flow.current.id).toBe("second");
		expect(panels(root).map((panel) => panel.hidden)).toEqual([true, false]);
	});

	it("unbinding stops following the flow and removes what it added", async () => {
		const { root, flow, unbind } = serve(markup());
		unbind();
		expect(region(root)).toBeNull();
		await flow.next();
		expect(panels(root).map((panel) => panel.hidden)).toEqual([false, true, true]);
		await userEvent.click(next());
		expect(flow.current.id).toBe("second");
	});

	it("warns about a trigger without a name or outside a list, with a link", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		serve(
			'<div data-component="stepper"><div data-component="stepper-item" data-step="first"><button data-component="stepper-trigger"></button></div></div>',
		);
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		expect(seen.some((message) => message.includes("SZ002") && message.includes("errors#sz002"))).toBe(true);
		expect(seen.some((message) => message.includes("SZ003"))).toBe(true);
	});
});

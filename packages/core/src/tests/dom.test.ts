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
	const unbind = options.bind === false ? () => {} : bindStepper(root, flow);
	cleanups.push(() => {
		unbind();
		container.remove();
	});
	return { container, root, flow, unbind };
}

/** Every element with its attributes sorted and its own text: what the page looks like, regardless of attribute order. */
function shape(node: Element): unknown {
	return {
		tag: node.tagName,
		attributes: Array.from(node.attributes, (attribute) => `${attribute.name}=${attribute.value}`).sort(),
		text: Array.from(node.childNodes)
			.filter((child) => child.nodeType === 3)
			.map((child) => child.textContent)
			.join(""),
		children: Array.from(node.children, shape),
	};
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

	it("reads linear from the flow and `data-orientation` from the markup", async () => {
		const { container, root, flow } = serve(markup('data-orientation="vertical"'), { linear: true });
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		expect([root.dataset.orientation, container.querySelector("ol")?.dataset.orientation]).toEqual([
			"vertical",
			"vertical",
		]);
		// A flow whose policy changes is rendered again: tabs from then on.
		flow.setOptions({});
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("tablist");
		expect(container.querySelector("ol")?.getAttribute("aria-orientation")).toBe("vertical");
		expect(await violations(container)).toEqual([]);
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

	it("unbinding stops following the flow and puts the page back as it was", async () => {
		const html = markup('aria-label="Checkout"').replace(
			'data-component="stepper-content" data-step="third">',
			'data-component="stepper-content" data-step="third" id="last-panel" hidden tabindex="0">',
		);
		const { root, flow, unbind } = serve(html, { bind: false });
		const before = shape(root);
		const stop = bindStepper(root, flow);
		await userEvent.click(next());
		await userEvent.click(next());
		expect(shape(root)).not.toEqual(before);
		stop();
		// Roles, ids, tabindex, `hidden`, filled-in text and the live region: all gone, the page's own values back.
		expect(shape(root)).toEqual(before);
		unbind();
		await flow.prev();
		expect(shape(root)).toEqual(before);
		// The buttons no longer move the flow.
		next().click();
		await new Promise((resolve) => setTimeout(resolve));
		expect(flow.current.id).toBe("second");
	});

	it("unbinding keeps what the page changed after the binding", async () => {
		const { root, unbind } = serve(markup());
		const panel = panels(root)[1];
		// Someone else took over this attribute: unbinding leaves it alone.
		panel.setAttribute("role", "region");
		unbind();
		expect(panel.getAttribute("role")).toBe("region");
		expect(panel.hasAttribute("id")).toBe(false);
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

describe("what the page wrote", () => {
	it("keeps the page's ids, names, roles and tabindex, and points references at the real ids", async () => {
		const html = markup()
			.replace('data-component="stepper-list"', 'data-component="stepper-list" aria-label="Checkout steps"')
			.replace(
				'<button data-component="stepper-trigger">',
				'<button data-component="stepper-trigger" id="tab-a" aria-describedby="hint">',
			)
			.replace(
				'data-component="stepper-content" data-step="first">',
				'data-component="stepper-content" data-step="first" id="panel-a" tabindex="-1">',
			)
			.replace(
				'data-component="stepper-content" data-step="second">',
				'data-component="stepper-content" data-step="second" aria-label="Pick a plan">',
			);
		const { container, root } = serve(html);
		const [first, second] = Array.from(root.querySelectorAll<HTMLElement>('[role="tab"]'));
		const [one, two] = panels(root);
		expect(first.id).toBe("tab-a");
		expect(first.getAttribute("aria-describedby")).toBe("hint");
		expect(first.getAttribute("aria-controls")).toBe("panel-a");
		expect([one.id, one.getAttribute("aria-labelledby"), one.getAttribute("tabindex")]).toEqual([
			"panel-a",
			"tab-a",
			"-1",
		]);
		// Named by the page: the binding adds no `aria-labelledby` that would override it.
		expect([two.getAttribute("aria-label"), two.hasAttribute("aria-labelledby")]).toEqual(["Pick a plan", false]);
		expect(second.getAttribute("aria-controls")).toBe(two.id);
		expect(root.querySelector("ol")?.getAttribute("aria-label")).toBe("Checkout steps");
		expect(await violations(container)).toEqual([]);
		// Arrow keys still move between tabs whose ids the page wrote.
		first.focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(document.activeElement).toBe(second);
		await userEvent.keyboard("{Home}");
		expect(document.activeElement).toBe(first);
	});

	it("hands focus to a panel with the page's id, and does not announce what the focused trigger reads", async () => {
		const html = markup().replace(
			'data-component="stepper-content" data-step="second">',
			'data-component="stepper-content" data-step="second" id="plan">',
		);
		const { root, flow } = serve(html);
		root.querySelector("input")?.focus();
		await flow.next();
		expect(document.activeElement?.id).toBe("plan");
		expect(region(root)?.textContent).toBe("");
	});

	it("keeps the page's role and name on the root, list, item and indicator", () => {
		const { root } = serve(
			markup('role="region" aria-labelledby="heading"')
				.replace('<ol data-component="stepper-list">', '<ol data-component="stepper-list" role="list">')
				.replace('data-component="stepper-item"', 'data-component="stepper-item" role="listitem"')
				.replace('<span data-component="stepper-indicator">', '<span data-component="stepper-indicator" role="img">'),
			{ linear: true },
		);
		expect([root.getAttribute("role"), root.getAttribute("aria-labelledby"), root.hasAttribute("aria-label")]).toEqual([
			"region",
			"heading",
			false,
		]);
		expect(root.querySelector("ol")?.getAttribute("role")).toBe("list");
		expect(root.querySelector("li")?.getAttribute("role")).toBe("listitem");
		expect(root.querySelector('[data-component="stepper-indicator"]')?.getAttribute("role")).toBe("img");
	});

	it("takes `hidden` on panels and `disabled` on Prev from the server as state, and keeps updating them", async () => {
		const html = markup()
			.replace(
				'data-component="stepper-content" data-step="second">',
				'data-component="stepper-content" data-step="second" hidden>',
			)
			.replace(
				'data-component="stepper-content" data-step="third">',
				'data-component="stepper-content" data-step="third" hidden>',
			)
			.replace('<button data-component="stepper-prev">', '<button data-component="stepper-prev" disabled>');
		const { root } = serve(html);
		const back = screen.getByRole("button", { name: "Back" }).element() as HTMLButtonElement;
		await userEvent.click(next());
		expect(panels(root).map((panel) => panel.hidden)).toEqual([true, false, true]);
		expect(back.disabled).toBe(false);
	});

	it("a `disabled` the page writes on Next is its own, followed when it changes", async () => {
		const { flow } = serve(
			markup().replace('<button data-component="stepper-next">', '<button data-component="stepper-next" disabled>'),
		);
		expect([next().disabled, next().hasAttribute("data-disabled")]).toEqual([true, true]);
		await flow.next();
		expect(next().disabled).toBe(true);
		// What a page does once the terms are accepted.
		next().disabled = false;
		await vi.waitFor(() => expect(next().hasAttribute("data-disabled")).toBe(false));
		await userEvent.click(next());
		expect(flow.current.id).toBe("third");
	});

	it("`aria-disabled` the page writes on Next stays, and the button does nothing", async () => {
		const { flow } = serve(
			markup().replace(
				'<button data-component="stepper-next">',
				'<button data-component="stepper-next" aria-disabled="true">',
			),
		);
		expect([next().disabled, next().getAttribute("aria-disabled"), next().hasAttribute("data-disabled")]).toEqual([
			false,
			"true",
			true,
		]);
		await userEvent.click(next(), { force: true });
		expect(flow.current.id).toBe("first");
		await flow.next();
		expect(next().getAttribute("aria-disabled")).toBe("true");
	});

	it("a panel whose step has no trigger is named by its title, never by a trigger that does not exist", async () => {
		const html = markup().replace(/<li data-component="stepper-item" data-step="third">[\s\S]*?<\/li>/, "");
		const { container, root } = serve(html);
		const third = panels(root)[2];
		expect([
			third.getAttribute("role"),
			third.hasAttribute("aria-labelledby"),
			third.getAttribute("aria-label"),
		]).toEqual(["tabpanel", false, "Third"]);
		for (const panel of panels(root)) {
			const label = panel.getAttribute("aria-labelledby");
			if (label) expect(document.getElementById(label)).not.toBeNull();
		}
		for (const tab of root.querySelectorAll('[role="tab"]')) {
			expect(document.getElementById(tab.getAttribute("aria-controls") ?? "")).not.toBeNull();
		}
		expect(await violations(container)).toEqual([]);
	});

	it("warns about a trigger that is not a button", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		serve(
			'<div data-component="stepper"><ol data-component="stepper-list"><li data-component="stepper-item" data-step="first"><span data-component="stepper-trigger">First</span></li></ol></div>',
		);
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		expect(seen.some((message) => message.includes("SZ005") && message.includes("<span>, not a <button>"))).toBe(true);
	});
});

describe("ids and keyboard", () => {
	it("step ids with spaces make valid id references", async () => {
		const spaced = [
			{ id: "your account", title: "Account" },
			{ id: "the plan", title: "Plan" },
		] as const;
		const container = document.createElement("div");
		container.innerHTML = `
<div data-component="stepper" id="spaced">
	<ol data-component="stepper-list">
		${spaced.map((step) => `<li data-component="stepper-item" data-step="${step.id}"><button data-component="stepper-trigger">${step.title}</button></li>`).join("")}
	</ol>
	${spaced.map((step) => `<div data-component="stepper-content" data-step="${step.id}">${step.title}</div>`).join("")}
</div>`;
		document.body.appendChild(container);
		const unbind = bindStepper(container.firstElementChild as HTMLElement, createStepper(spaced));
		cleanups.push(() => {
			unbind();
			container.remove();
		});
		for (const tab of container.querySelectorAll('[role="tab"]')) {
			const controls = tab.getAttribute("aria-controls") ?? "";
			expect(controls).not.toMatch(/\s/);
			const panel = document.getElementById(controls);
			expect(panel?.getAttribute("aria-labelledby")).toBe(tab.id);
		}
		expect(await violations(container)).toEqual([]);
		screen.getByRole("tab", { name: "Account" }).element().focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(document.activeElement?.textContent).toBe("Plan");
	});

	it("a vertical list moves with Up and Down, Home and End, not Left and Right", async () => {
		const { root, flow } = serve(markup('data-orientation="vertical"'));
		expect(root.querySelector("ol")?.getAttribute("aria-orientation")).toBe("vertical");
		screen.getByRole("tab", { name: /First/ }).element().focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(flow.current.id).toBe("first");
		await userEvent.keyboard("{ArrowDown}");
		expect(flow.current.id).toBe("second");
		await userEvent.keyboard("{End}");
		expect(document.activeElement).toBe(screen.getByRole("tab", { name: /Third/ }).element());
		await userEvent.keyboard("{Home}");
		expect(flow.current.id).toBe("first");
		await userEvent.keyboard("{ArrowUp}");
		expect(flow.current.id).toBe("first");
	});
});

describe("changes on the page", () => {
	/** How many times the stepper rendered: one query for its parts per render. */
	const renders = (root: HTMLElement) => {
		const spy = vi.spyOn(root, "querySelectorAll");
		return () => spy.mock.calls.filter(([selector]) => selector === '[data-component^="stepper-"]').length;
	};
	const settle = () => new Promise((resolve) => setTimeout(resolve));

	it("ignores changes that are not stepper parts", async () => {
		const { root } = serve(markup());
		const count = renders(root);
		panels(root)[0].insertAdjacentHTML("beforeend", "<p>Saved</p>");
		panels(root)[0].append("text");
		next().textContent = "Finish";
		panels(root)[1].querySelector("input")?.toggleAttribute("disabled");
		await settle();
		expect(count()).toBe(0);
	});

	it("renders once for a burst of parts added or removed", async () => {
		const { root } = serve(markup());
		const count = renders(root);
		for (let i = 0; i < 3; i++)
			root.insertAdjacentHTML("beforeend", '<button data-component="stepper-next">More</button>');
		root.querySelector('[data-component="stepper-prev"]')?.remove();
		await settle();
		expect(count()).toBe(1);
		const added = Array.from(root.querySelectorAll<HTMLButtonElement>('[data-component="stepper-next"]'));
		expect(added.every((button) => button.type === "button")).toBe(true);
		// A removed trigger: the panel it named is named by its title instead.
		root.querySelector('[data-component="stepper-item"][data-step="first"]')?.remove();
		await settle();
		expect(count()).toBe(2);
		expect(panels(root)[0].getAttribute("aria-label")).toBe("First");
	});

	it("changes inside a nested stepper do not render the outer one", async () => {
		const { container, root } = serve(`
<div data-component="stepper">
	<div data-component="stepper-content" data-step="first">${markup('id="inner"')}</div>
</div>`);
		const inner = container.querySelector<HTMLElement>("#inner") as HTMLElement;
		cleanups.push(bindStepper(inner, createStepper(steps)));
		const outer = renders(root);
		const own = renders(inner);
		inner.insertAdjacentHTML("beforeend", '<button data-component="stepper-prev">Back again</button>');
		await settle();
		expect([outer(), own()]).toEqual([0, 1]);
		// Removing the whole inner stepper takes none of the outer's parts.
		inner.remove();
		await settle();
		expect(outer()).toBe(0);
	});

	it("renders nothing after unbinding, even for a change already queued", async () => {
		const { root, unbind } = serve(markup());
		const count = renders(root);
		root.insertAdjacentHTML("beforeend", '<button data-component="stepper-next">More</button>');
		unbind();
		await settle();
		expect(count()).toBe(0);
		expect(root.querySelector('[data-component="stepper-next"]:last-of-type')?.hasAttribute("type")).toBe(false);
	});
});

describe("where the stepper lives", () => {
	it("binds a root that is not in the document yet", async () => {
		const root = document.createElement("div");
		root.innerHTML = markup();
		const stepper = root.firstElementChild as HTMLElement;
		const flow = createStepper(steps);
		const unbind = bindStepper(stepper, flow);
		await flow.next();
		expect(panels(stepper).map((panel) => panel.hidden)).toEqual([true, false, true]);
		document.body.appendChild(root);
		cleanups.push(() => {
			unbind();
			root.remove();
		});
		await userEvent.click(next());
		expect(flow.current.id).toBe("third");
	});

	it("works inside a shadow root: ids, keyboard and focus stay in it", async () => {
		const host = document.createElement("div");
		document.body.appendChild(host);
		const shadow = host.attachShadow({ mode: "open" });
		shadow.innerHTML = markup('id="shadowed"');
		const stepper = shadow.firstElementChild as HTMLElement;
		const flow = createStepper(steps);
		const unbind = bindStepper(stepper, flow);
		cleanups.push(() => {
			unbind();
			host.remove();
		});
		const tabs = Array.from(shadow.querySelectorAll<HTMLElement>('[role="tab"]'));
		expect(shadow.getElementById(tabs[0].getAttribute("aria-controls") ?? "")?.getAttribute("aria-labelledby")).toBe(
			tabs[0].id,
		);
		tabs[0].focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(shadow.activeElement).toBe(tabs[1]);
		shadow.querySelector<HTMLInputElement>('[data-step="second"] input')?.focus();
		await flow.next();
		expect(shadow.activeElement).toBe(panels(stepper)[2]);
		// Parts added later are picked up in a shadow root too.
		stepper.insertAdjacentHTML("beforeend", '<button data-component="stepper-prev">Again</button>');
		await vi.waitFor(() => expect(stepper.lastElementChild?.getAttribute("type")).toBe("button"));
	});
});

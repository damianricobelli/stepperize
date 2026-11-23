import axe from "axe-core";
import { afterEach, describe, expect, it, vi } from "vitest";
import { page as screen, userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-vue";
import { createSSRApp, defineComponent, h, mergeProps, nextTick, ref, type VNode } from "vue";
import { renderToString } from "vue/server-renderer";
import { defineStepper } from "../index";

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

/** Every attribute goes to the Root, as in a template. */
const Full = defineComponent({
	inheritAttrs: false,
	setup(_, { attrs }) {
		return () => (
			<Stepper.Root {...attrs}>
				<Stepper.List>
					{{
						item: () => (
							<Stepper.Item>
								<Stepper.Trigger>
									<Stepper.Indicator />
									<Stepper.Title />
									<Stepper.Description />
								</Stepper.Trigger>
							</Stepper.Item>
						),
					}}
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
	},
}) as unknown as new () => { $props: Record<string, unknown> };

const full = (props: Record<string, unknown> = {}) => render(() => h(Full, props));
const next = () => screen.getByRole("button", { name: "Continue" }).element() as HTMLButtonElement;
const region = (container: Element) => container.querySelector('[data-component="stepper"] > [aria-live="polite"]');

/** Grabs the shared flow of the Root it is rendered in. */
function grab(definition = flow) {
	const out = { api: undefined as unknown as Api };
	const Grab = defineComponent({
		setup() {
			out.api = definition.useStepperContext() as Api;
			return () => null;
		},
	});
	return { out, Grab };
}

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
		const outer = defineStepper(steps);
		const { container } = await render(() => (
			<outer.Stepper.Root data-testid="outer">
				<outer.Stepper.List>
					{{
						item: () => (
							<outer.Stepper.Item>
								<outer.Stepper.Indicator />
							</outer.Stepper.Item>
						),
					}}
				</outer.Stepper.List>
				<outer.Stepper.Content step="first">
					{/* A nested stepper's triggers are not this one's. */}
					<Full />
				</outer.Stepper.Content>
			</outer.Stepper.Root>
		));
		await nextTick();
		const panel = container.querySelector('[data-testid="outer"] > [data-component="stepper-content"]');
		expect([panel?.getAttribute("role"), panel?.getAttribute("aria-label")]).toEqual(["group", "First"]);
		expect(container.querySelector('[data-testid="outer"] > ol')?.hasAttribute("role")).toBe(false);
		expect(container.querySelectorAll('[role="tabpanel"]').length).toBe(1);
		expect(await violations(container)).toEqual([]);
	});

	it("becomes a tablist when its triggers appear later", async () => {
		const show = ref(false);
		const { container } = await render(() => (
			<Stepper.Root>
				<Stepper.List>
					<Stepper.Item step="first">{show.value ? <Stepper.Trigger>First</Stepper.Trigger> : null}</Stepper.Item>
				</Stepper.List>
			</Stepper.Root>
		));
		await nextTick();
		expect(container.querySelector("ol")?.hasAttribute("role")).toBe(false);
		show.value = true;
		await nextTick();
		await nextTick();
		expect(container.querySelector("ol")?.getAttribute("role")).toBe("tablist");
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
		const Grab = defineComponent({
			setup() {
				api = checked.useStepperContext();
				return () => null;
			},
		});
		const { container } = await render(() => (
			<checked.Stepper.Root>
				<Grab />
				<checked.Stepper.List>
					{{
						item: () => (
							<checked.Stepper.Item>
								<checked.Stepper.Trigger>
									<checked.Stepper.Indicator />
									<checked.Stepper.Title />
								</checked.Stepper.Trigger>
							</checked.Stepper.Item>
						),
					}}
				</checked.Stepper.List>
			</checked.Stepper.Root>
		));
		const item = container.querySelector<HTMLElement>('li[data-step="a"]');
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["current", false]);
		expect(await api.next("nope")).toMatchObject({ accepted: false, reason: "invalid" });
		await nextTick();
		expect(item?.hasAttribute("data-invalid")).toBe(true);
		expect(container.querySelector('[data-component="stepper-indicator"]')?.hasAttribute("data-invalid")).toBe(true);
		await api.next("ok");
		await nextTick();
		expect([item?.dataset.state, item?.hasAttribute("data-invalid")]).toEqual(["complete", false]);
		expect(container.querySelector<HTMLElement>('li[data-step="b"]')?.dataset.state).toBe("current");
	});

	it("useItem and the Item slot read the enclosing item", async () => {
		const Badge = defineComponent({
			setup() {
				const item = Stepper.useItem();
				return () => (
					<span data-testid={`badge-${item.value.step.id}`}>
						{item.value.index + 1} {item.value.state} {String(item.value.disabled)} {String(item.value.pending)}
					</span>
				);
			},
		});
		await render(() => (
			<Stepper.Root linear>
				<Stepper.List>
					{{
						item: () => (
							<Stepper.Item>
								{{
									default: (item: { step: { id: string }; state: string }) => [
										<Badge />,
										<i data-testid={`slot-${item.step.id}`}>{item.state}</i>,
									],
								}}
							</Stepper.Item>
						),
					}}
				</Stepper.List>
			</Stepper.Root>
		));
		expect(screen.getByTestId("badge-first").element().textContent).toBe("1 current false false");
		expect(screen.getByTestId("badge-third").element().textContent).toBe("3 pending true false");
		expect(screen.getByTestId("slot-first").element().textContent).toBe("current");
	});

	it("keeps an inactive panel mounted and hidden with forceMount", async () => {
		const { container } = await render(() => (
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
		const { container } = await render(() => (
			<Stepper.Root>
				{{
					default: (stepper: Api) => [
						<output>{stepper.current.id}</output>,
						<Stepper.List onKeydown={(event: KeyboardEvent) => event.preventDefault()}>
							{{
								item: () => (
									<Stepper.Item>
										<Stepper.Trigger>
											<Stepper.Title />
										</Stepper.Trigger>
									</Stepper.Item>
								),
							}}
						</Stepper.List>,
						<Stepper.Next onClick={(event: MouseEvent) => event.preventDefault()}>Continue</Stepper.Next>,
					],
				}}
			</Stepper.Root>
		));
		await userEvent.click(next());
		screen.getByRole("tab", { name: "First" }).element().focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(container.querySelector("output")?.textContent).toBe("first");
	});

	it("the Root slot follows the flow", async () => {
		const { container } = await render(() => (
			<Stepper.Root>
				{{
					default: (stepper: Api) => [<output>{stepper.current.id}</output>, <Stepper.Next>Continue</Stepper.Next>],
				}}
			</Stepper.Root>
		));
		await userEvent.click(next());
		expect(container.querySelector("output")?.textContent).toBe("second");
	});

	it("arrow keys move between tabs, swapped in right-to-left layouts", async () => {
		await render(() => (
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
		const { container } = await full();
		expect(region(container)?.textContent).toBe("");
		next().focus();
		await userEvent.click(next());
		expect(document.activeElement).toBe(next());
		expect(region(container)?.textContent).toBe("Second");
	});

	it("moves focus to the new panel when the focused element unmounts, without announcing twice", async () => {
		const { out, Grab } = grab();
		const { container } = await render(() => (
			<Stepper.Root>
				<Grab />
				<Stepper.Content step="first">
					<input aria-label="Name" />
				</Stepper.Content>
				<Stepper.Content step="second">Two</Stepper.Content>
			</Stepper.Root>
		));
		container.querySelector("input")?.focus();
		await out.api.next();
		await nextTick();
		expect(document.activeElement?.textContent).toBe("Two");
		expect(region(container)?.textContent).toBe("");
	});

	it("never moves focus that is outside the stepper", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { out, Grab } = grab();
		await render(() => (
			<Stepper.Root>
				<Grab />
				<Stepper.Content step="second">Two</Stepper.Content>
			</Stepper.Root>
		));
		outside.focus();
		await out.api.next();
		await nextTick();
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
		await nextTick();
		expect(document.activeElement).toBe(second);
		expect(root?.hasAttribute("aria-busy")).toBe(false);
		expect(second.hasAttribute("aria-disabled")).toBe(false);
	});
});

describe("elements and as-child", () => {
	it("exposes the element of every primitive and renders text as spans", async () => {
		const refs = {
			root: ref(),
			list: ref(),
			item: ref(),
			trigger: ref(),
			title: ref(),
			content: ref(),
			next: ref(),
		};
		await render(() => (
			<Stepper.Root ref={refs.root} class="mine" data-extra="yes">
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
				<Stepper.Next ref={refs.next}>Continue</Stepper.Next>
			</Stepper.Root>
		));
		expect(Object.values(refs).map((target) => target.value?.$el.tagName)).toEqual([
			"DIV",
			"OL",
			"LI",
			"BUTTON",
			"SPAN",
			"DIV",
			"BUTTON",
		]);
		const root = refs.root.value.$el as HTMLElement;
		expect([root.className, root.dataset.extra, root.dataset.component]).toEqual(["mine", "yes", "stepper"]);
	});

	it("as-child hands ARIA, ids and handlers to your own element", async () => {
		const own = ref<HTMLElement>();
		const { container } = await render(() => (
			<Stepper.Root>
				{{
					default: (stepper: Api) => [
						<output>{stepper.current.id}</output>,
						<Stepper.List asChild>
							<nav>
								<Stepper.Item step="first" asChild>
									<div>
										<Stepper.Trigger asChild>
											<a href="#first">First</a>
										</Stepper.Trigger>
									</div>
								</Stepper.Item>
							</nav>
						</Stepper.List>,
						<Stepper.Next asChild>
							<button type="submit" class="mine" ref={own}>
								Continue
							</button>
						</Stepper.Next>,
					],
				}}
			</Stepper.Root>
		));
		expect(container.querySelector("nav")?.dataset.component).toBe("stepper-list");
		expect(container.querySelector<HTMLElement>("nav > div")?.dataset.state).toBe("current");
		expect(container.querySelector("a")?.getAttribute("role")).toBe("tab");
		const button = next();
		expect([button.className, button.dataset.component, button.type]).toEqual(["mine", "stepper-next", "submit"]);
		expect(own.value).toBe(button);
		await userEvent.click(button);
		expect(container.querySelector("output")?.textContent).toBe("second");
	});

	it("as-child on an element that is not a button: `disabled` only when it is", async () => {
		const { container } = await render(() => (
			<Stepper.Root linear>
				<Stepper.List>
					{{
						item: ({ step }: { step: (typeof steps)[number] }) => (
							<Stepper.Item>
								<Stepper.Trigger asChild>
									<a href={`#${step.id}`}>{step.title}</a>
								</Stepper.Trigger>
							</Stepper.Item>
						),
					}}
				</Stepper.List>
				<Stepper.Prev asChild>
					<a href="#back">Back</a>
				</Stepper.Prev>
				<Stepper.Next asChild>
					<a href="#next">Continue</a>
				</Stepper.Next>
			</Stepper.Root>
		));
		const links = Array.from(container.querySelectorAll("a"), (link) => [
			link.getAttribute("href"),
			link.getAttribute("disabled"),
			link.getAttribute("type"),
		]);
		// Absent while it can be used. On an element without a `disabled` property Vue writes "true".
		expect(links).toEqual([
			["#first", null, null],
			["#second", "true", null],
			["#third", "true", null],
			["#back", "true", null],
			["#next", null, null],
		]);
	});

	it("as-child fills an empty child with the title, and keeps a child's own content", async () => {
		const { container } = await render(() => (
			<Stepper.Root>
				<Stepper.Item step="second">
					<Stepper.Title asChild>
						{/* biome-ignore lint/a11y/useHeadingContent: as-child fills it with the title */}
						<h3 class="title" />
					</Stepper.Title>
					<Stepper.Description asChild>
						<p>Your own words</p>
					</Stepper.Description>
					<Stepper.Description asChild>
						<em />
					</Stepper.Description>
				</Stepper.Item>
			</Stepper.Root>
		));
		const title = container.querySelector("h3");
		expect([title?.textContent, title?.className, title?.dataset.component]).toEqual([
			"Second",
			"title",
			"stepper-title",
		]);
		expect(container.querySelector("p")?.textContent).toBe("Your own words");
		expect(container.querySelector("em")?.textContent).toBe("Then this");
	});

	it("as-child on a List with an `item` slot: the items fill your element", async () => {
		const nav = ref<HTMLElement>();
		const { container } = await render(() => (
			<Stepper.Root>
				<Stepper.List asChild>
					{{
						default: () => <nav ref={nav} class="steps" />,
						item: ({ step }: { step: (typeof steps)[number] }) => (
							<Stepper.Item>
								<Stepper.Trigger>{step.title}</Stepper.Trigger>
							</Stepper.Item>
						),
					}}
				</Stepper.List>
			</Stepper.Root>
		));
		expect(nav.value).toBe(container.querySelector("nav"));
		expect([nav.value?.className, nav.value?.getAttribute("role")]).toEqual(["steps", "tablist"]);
		expect(Array.from(nav.value?.children ?? [], (item) => item.getAttribute("data-step"))).toEqual([
			"first",
			"second",
			"third",
		]);
		screen.getByRole("tab", { name: "First" }).element().focus();
		await userEvent.keyboard("{ArrowRight}");
		expect(document.activeElement?.textContent).toBe("Second");
	});

	it("takes slots through `v-slots` in TSX", async () => {
		const { container } = await render(() => (
			<Stepper.Root
				v-slots={{
					default: (stepper) => [
						<output>{stepper.current.id}</output>,
						<Stepper.List v-slots={{ item: ({ step }) => <Stepper.Item>{step.title}</Stepper.Item> }} />,
					],
				}}
			/>
		));
		expect(container.querySelector("output")?.textContent).toBe("first");
		expect(container.querySelectorAll("li").length).toBe(3);
	});

	it("merges listeners handed over as an array, as a wrapper passing $attrs does", async () => {
		const mine = vi.fn();
		const theirs = vi.fn();
		await render(() =>
			h(Stepper.Root, mergeProps({ onFinish: mine }, { onFinish: theirs }, { snapshot: { step: "third" } }), () =>
				h(Stepper.Next, null, () => "Continue"),
			),
		);
		await userEvent.click(next());
		expect([mine.mock.calls.length, theirs.mock.calls.length]).toEqual([1, 1]);
	});
});

describe("live region", () => {
	it("is hidden even when a strict Content Security Policy blocked the server's style attribute", async () => {
		const frame = document.createElement("iframe");
		frame.srcdoc = `<meta http-equiv="Content-Security-Policy" content="style-src 'none'"><div id="app"></div>`;
		document.body.appendChild(frame);
		await new Promise((resolve) => frame.addEventListener("load", resolve, { once: true }));
		const doc = frame.contentDocument as Document;
		const container = doc.getElementById("app") as HTMLElement;
		const App = () => h(Full);
		container.innerHTML = await renderToString(createSSRApp(App));
		const span = container.querySelector<HTMLElement>('[aria-live="polite"]');
		// The policy dropped the declarations: the region would show what it announces.
		expect(span?.style.position).toBe("");
		const original = container.innerHTML;
		const app = createSSRApp(App);
		app.mount(container);
		await nextTick();
		expect(frame.contentWindow?.getComputedStyle(span as Element).position).toBe("absolute");
		expect(span?.style.clipPath).toBe("inset(50%)");
		app.unmount();
		frame.remove();
		expect(original).toContain("aria-live");
	});
});

describe("development diagnostics", () => {
	async function warnings(ui: () => VNode) {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await render(ui);
		const seen = warn.mock.calls.map((call) => String(call[0]));
		warn.mockRestore();
		return seen;
	}

	it("warns about as-child without an element to receive the props", async () => {
		const seen = await warnings(() => (
			<Stepper.Root>
				<Stepper.List asChild />
			</Stepper.Root>
		));
		expect(seen.some((message) => message.includes("SZ001"))).toBe(true);
	});

	it("warns when as-child has more than one node, and renders the first", async () => {
		let container!: HTMLElement;
		const seen = await warnings(() => (
			<div ref={(el) => (container = el as HTMLElement)}>
				<Stepper.Root>
					<Stepper.Next asChild>
						<button type="button">Continue</button>
						<span>dropped</span>
					</Stepper.Next>
				</Stepper.Root>
			</div>
		));
		expect(seen.some((message) => message.includes("SZ001") && message.includes("more than one node"))).toBe(true);
		expect(container.querySelector("button")?.dataset.component).toBe("stepper-next");
		expect(container.textContent).not.toContain("dropped");
	});

	it("warns when as-child on a List with items gets an element that is not empty", async () => {
		const seen = await warnings(() => (
			<Stepper.Root>
				<Stepper.List asChild>
					{{
						default: () => (
							<nav>
								<h2>Steps</h2>
							</nav>
						),
						item: () => <Stepper.Item />,
					}}
				</Stepper.List>
			</Stepper.Root>
		));
		expect(seen.some((message) => message.includes("SZ001") && message.includes("items are not rendered"))).toBe(true);
	});

	it("warns when the child of as-child drops the props it received, and not when it passes them on", async () => {
		const Swallows = defineComponent({
			inheritAttrs: false,
			setup:
				(_, { slots }) =>
				() => <button type="button">{slots.default?.()}</button>,
		});
		const Passes = defineComponent({
			inheritAttrs: false,
			setup:
				(_, { attrs, slots }) =>
				() => (
					<button type="button" {...attrs}>
						{slots.default?.()}
					</button>
				),
		});
		const bad = await warnings(() => (
			<Stepper.Root>
				<Stepper.Next asChild>
					<Swallows>Continue</Swallows>
				</Stepper.Next>
			</Stepper.Root>
		));
		expect(bad.some((message) => message.includes("SZ001") && message.includes("did not receive its props"))).toBe(
			true,
		);
		cleanup();
		const good = await warnings(() => (
			<Stepper.Root>
				<Stepper.Prev asChild>
					<Passes>Back</Passes>
				</Stepper.Prev>
			</Stepper.Root>
		));
		expect(good).toEqual([]);
	});

	it("warns about a trigger without a name or outside a list, with a link", async () => {
		const seen = await warnings(() => (
			<Stepper.Root>
				<Stepper.Item step="first" asChild>
					<div>
						<Stepper.Trigger />
					</div>
				</Stepper.Item>
			</Stepper.Root>
		));
		expect(seen.some((message) => message.includes("SZ002") && message.includes("errors#sz002"))).toBe(true);
		expect(seen.some((message) => message.includes("SZ003"))).toBe(true);
	});

	it("throws coded errors outside a Root or an Item, and for unknown steps", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		await expect(render(() => <Stepper.Next>Continue</Stepper.Next>)).rejects.toThrow(/SZ100/);
		await expect(
			render(() => (
				<Stepper.Root>
					<Stepper.Indicator />
				</Stepper.Root>
			)),
		).rejects.toThrow(/SZ101/);
		await expect(
			render(() => (
				<Stepper.Root>
					<Stepper.Item step={"nope" as "first"} />
				</Stepper.Root>
			)),
		).rejects.toThrow(/SZ102/);
		warn.mockRestore();
	});
});

describe("hydration", () => {
	it("keeps the server HTML: nothing changes until the user acts", async () => {
		const App = () => [h(Full, { snapshot: { step: "second", complete: ["first"] } }), h(Full)];
		const container = document.createElement("div");
		container.innerHTML = await renderToString(createSSRApp(App));
		document.body.appendChild(container);
		const original = container.innerHTML;
		const ids = Array.from(container.querySelectorAll("[id]"), (node) => node.id);
		expect(new Set(ids).size).toBe(ids.length);
		const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const app = createSSRApp(App);
		app.mount(container);
		await nextTick();
		expect(warnings).not.toHaveBeenCalled();
		expect(errors).not.toHaveBeenCalled();
		expect(container.innerHTML).toBe(original);
		// Hydrated, not inert.
		await userEvent.click(container.querySelectorAll<HTMLElement>('[data-component="stepper-next"]')[1]);
		expect(container.querySelectorAll('[aria-selected="true"]')[1]?.textContent).toContain("Second");
		app.unmount();
		container.remove();
		warnings.mockRestore();
		errors.mockRestore();
	});
});

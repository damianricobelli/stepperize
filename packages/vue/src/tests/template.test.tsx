import { afterEach, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-vue";
import { createApp, h, nextTick, ref, Suspense } from "vue";
import AsyncStep from "./AsyncStep.vue";
import Checkout from "./Checkout.vue";

afterEach(cleanup);

/** What `AsyncStep.vue` hands out; `.vue` modules are typed as plain components here. */
type Survey = { next: () => Promise<unknown>; prev: () => Promise<unknown>; current: { id: string } };

it("owns the flow after a top-level await in <script setup>, under Suspense", async () => {
	const warn = vi.spyOn(console, "warn");
	let stepper!: Survey;
	const show = ref(true);
	let release!: (step: "questions") => void;
	const load = () =>
		new Promise<"questions">((resolve) => {
			release = resolve;
		});
	const ready = (value: Survey) => {
		stepper = value;
	};
	// Mounted with `createApp`: Vue Test Utils' wrapper never resolves a Suspense it did not create.
	const container = document.body.appendChild(document.createElement("div"));
	const app = createApp(() =>
		show.value ? h(Suspense, null, { default: () => h(AsyncStep, { load, ready }), fallback: () => "…" }) : null,
	);
	app.mount(container);
	expect(container.textContent).toBe("…");
	release("questions");
	await expect.poll(() => container.textContent).toBe("questions");
	expect(warn).not.toHaveBeenCalled();
	await stepper.next();
	await expect.poll(() => container.textContent).toBe("thanks");
	// Destroyed with the component: an action afterwards changes nothing.
	show.value = false;
	await nextTick();
	await stepper.prev();
	expect(stepper.current.id).toBe("thanks");
	app.unmount();
	container.remove();
	warn.mockRestore();
});

it("works from a single-file component template: slots, listeners and as-child", async () => {
	const screen = await render(Checkout);
	const output = screen.getByRole("status");
	await expect.element(output).toHaveTextContent("Cart 1/2");
	expect(screen.container.querySelector(".checkout")?.getAttribute("data-component")).toBe("stepper");
	// An empty element under `as-child` shows the title, and keeps this component's scoped styles.
	const heading = screen.container.querySelector<HTMLElement>("header > h2");
	expect([
		heading?.textContent,
		heading?.dataset.component,
		getComputedStyle(heading as Element).letterSpacing,
	]).toEqual(["Payment", "stepper-title", "2px"]);
	expect(heading?.parentElement?.dataset.state).toBe("pending");
	expect(screen.getByRole("tab", { name: "Payment" }).element().getAttribute("data-nth")).toBe("1");
	const hidden = screen.container.querySelector<HTMLElement>('[data-step="payment"][data-component="stepper-content"]');
	expect(hidden?.hidden).toBe(true);
	const next = screen.getByRole("button", { name: "Continue" });
	expect(next.element().getAttribute("type")).toBe("submit");
	await userEvent.click(next);
	await expect.element(output).toHaveTextContent("Payment 2/2");
	expect(hidden?.hidden).toBe(false);
	await userEvent.click(next);
	await expect.element(output).toHaveTextContent("Payment 2/2 done");
});

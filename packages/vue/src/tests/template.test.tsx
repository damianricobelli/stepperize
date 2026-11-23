import { afterEach, expect, it } from "vitest";
import { userEvent } from "vitest/browser";
import { cleanup, render } from "vitest-browser-vue";
import Checkout from "./Checkout.vue";

afterEach(cleanup);

it("works from a single-file component template: slots, listeners and as-child", async () => {
	const screen = await render(Checkout);
	const output = screen.getByRole("status");
	await expect.element(output).toHaveTextContent("Cart 1/2");
	expect(screen.container.querySelector(".checkout")?.getAttribute("data-component")).toBe("stepper");
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

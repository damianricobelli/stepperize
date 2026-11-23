import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render } from "vitest-browser-vue";
import { defineComponent, nextTick, Transition } from "vue";
import { defineStepper } from "../index";

afterEach(cleanup);

// A real CSS transition: Vue waits for `transitionend` before removing the leaving panel.
const style = document.createElement("style");
style.textContent =
	".fade-enter-active,.fade-leave-active{transition:opacity 40ms linear}.fade-enter-from,.fade-leave-to{opacity:0}";
beforeAll(() => document.head.appendChild(style));
afterAll(() => style.remove());
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

const flow = defineStepper([
	{ id: "a", title: "A" },
	{ id: "b", title: "B" },
]);
const { Stepper } = flow;
type Api = ReturnType<typeof flow.useStepper>;

/** `vitest-browser-vue` stubs `<Transition>` by default: these tests need the real one. */
const real = { global: { stubs: { transition: false } } };

function grab() {
	const out = { api: undefined as unknown as Api };
	const Grab = defineComponent({
		setup() {
			out.api = flow.useStepperContext();
			return () => null;
		},
	});
	return { out, Grab };
}

const region = (container: Element) => container.querySelector('[aria-live="polite"]');
const panel = (step: string) => document.querySelector(`[data-component="stepper-content"][data-step="${step}"]`);

describe("<Transition> around Stepper.Content", () => {
	for (const mode of ["in-out", "out-in", undefined] as const) {
		it(`one keyed panel, mode ${mode ?? "default"}: focus in the leaving panel moves to the new one`, async () => {
			const { out, Grab } = grab();
			const { container } = await render(
				() => (
					<Stepper.Root>
						{{
							default: (stepper: Api) => [
								<Grab />,
								<Transition name="fade" mode={mode}>
									<Stepper.Content key={stepper.current.id} step={stepper.current.id}>
										<input aria-label={stepper.current.id} />
									</Stepper.Content>
								</Transition>,
							],
						}}
					</Stepper.Root>
				),
				real,
			);
			container.querySelector("input")?.focus();
			await out.api.next();
			await nextTick();
			// The old panel is still on the page (in-out only starts its leave once the new one entered).
			expect(panel("a")).not.toBeNull();
			await settle();
			expect(panel("a")).toBeNull();
			expect(document.activeElement).toBe(panel("b"));
			// Focus on the panel reads the step: the live region does not say it again.
			expect(region(container)?.textContent).toBe("");
		});
	}

	it("one Transition per panel: both animate and focus moves to the new panel", async () => {
		const { out, Grab } = grab();
		const { container } = await render(
			() => (
				<Stepper.Root>
					<Grab />
					{(["a", "b"] as const).map((step) => (
						<Transition name="fade" key={step}>
							<Stepper.Content step={step}>
								<input aria-label={step} />
							</Stepper.Content>
						</Transition>
					))}
				</Stepper.Root>
			),
			real,
		);
		container.querySelector("input")?.focus();
		await out.api.next();
		await nextTick();
		expect(panel("a")?.className).toContain("fade-leave-active");
		expect(panel("b")?.className).toContain("fade-enter-active");
		expect(document.activeElement).toBe(panel("b"));
		await settle();
		expect(panel("a")).toBeNull();
		expect(document.activeElement).toBe(panel("b"));
	});

	it("out-in: focus moved elsewhere during the leave stays there, and the step is announced", async () => {
		const { out, Grab } = grab();
		const { container } = await render(
			() => (
				<Stepper.Root>
					{{
						default: (stepper: Api) => [
							<Grab />,
							<Transition name="fade" mode="out-in">
								<Stepper.Content key={stepper.current.id} step={stepper.current.id}>
									<input aria-label={stepper.current.id} />
								</Stepper.Content>
							</Transition>,
							<Stepper.Next>Continue</Stepper.Next>,
						],
					}}
				</Stepper.Root>
			),
			real,
		);
		container.querySelector("input")?.focus();
		await out.api.next();
		await nextTick();
		const button = container.querySelector<HTMLButtonElement>('[data-component="stepper-next"]');
		button?.focus();
		await settle();
		expect(document.activeElement).toBe(button);
		expect(region(container)?.textContent).toBe("B");
	});

	it("out-in: focus outside the stepper is never moved", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { out, Grab } = grab();
		await render(
			() => (
				<Stepper.Root>
					{{
						default: (stepper: Api) => [
							<Grab />,
							<Transition name="fade" mode="out-in">
								<Stepper.Content key={stepper.current.id} step={stepper.current.id}>
									{stepper.current.title}
								</Stepper.Content>
							</Transition>,
						],
					}}
				</Stepper.Root>
			),
			real,
		);
		outside.focus();
		await out.api.next();
		await settle();
		expect(document.activeElement).toBe(outside);
		outside.remove();
	});
});

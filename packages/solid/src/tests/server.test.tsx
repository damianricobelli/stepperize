// @vitest-environment node
import { createResource, Show, Suspense } from "solid-js";
import { renderToStream, renderToString, renderToStringAsync } from "solid-js/web";
import { expect, it, vi } from "vitest";
import { defineStepper, type Snapshot } from "../index";
import { Full, type steps } from "./fixtures";

it("renders the stepper and the primitives on the server without browser globals or callbacks", () => {
	const onChange = vi.fn();
	const onInvalidStep = vi.fn();
	const flow = defineStepper([
		{ id: "cart", title: "Cart" },
		{ id: "review", title: "Review" },
	]);
	function Local() {
		const stepper = flow.useStepper({ snapshot: { step: "review" }, step: "nope", onChange, onInvalidStep });
		return <span>{stepper.current.id}</span>;
	}
	const errors = vi.spyOn(console, "error").mockImplementation(() => {});
	const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
	const html = renderToString(() => (
		<>
			<Local />
			<flow.Stepper.Root onChange={onChange}>
				<flow.Stepper.List>
					{(_step) => (
						<flow.Stepper.Item>
							<flow.Stepper.Trigger>
								<flow.Stepper.Title />
							</flow.Stepper.Trigger>
						</flow.Stepper.Item>
					)}
				</flow.Stepper.List>
				<flow.Stepper.Content step="cart">Cart form</flow.Stepper.Content>
				<flow.Stepper.Next>Continue</flow.Stepper.Next>
			</flow.Stepper.Root>
		</>
	));
	expect(html).toMatch(/<span[^>]*>review<\/span>/);
	expect(html).toContain('role="tablist"');
	expect(html).toContain('role="tabpanel"');
	expect(html).toContain("Cart form");
	expect(html).toContain('aria-selected="true"');
	expect(errors).not.toHaveBeenCalled();
	expect(warnings).not.toHaveBeenCalled();
	expect(onChange).not.toHaveBeenCalled();
	expect(onInvalidStep).not.toHaveBeenCalled();
	errors.mockRestore();
	warnings.mockRestore();
});

/** A saved snapshot loaded the way a SolidStart route loads it: the flow waits under Suspense. */
function Resumed(props: { onChange: () => void; onInvalidStep: () => void }) {
	const [saved] = createResource(
		() =>
			new Promise<Partial<Snapshot<typeof steps>>>((resolve) =>
				setTimeout(() => resolve({ step: "third", complete: ["first", "second"] }), 5),
			),
	);
	return (
		<Suspense fallback={<p>Loading</p>}>
			<Show when={saved()}>
				{(snapshot) => (
					<Full
						linear
						snapshot={snapshot()}
						step="nope"
						onChange={props.onChange}
						onInvalidStep={props.onInvalidStep}
					/>
				)}
			</Show>
		</Suspense>
	);
}

it("renderToStringAsync waits for the snapshot and renders the resumed step, still without callbacks", async () => {
	const callbacks = { onChange: vi.fn(), onInvalidStep: vi.fn() };
	const html = await renderToStringAsync(() => <Resumed {...callbacks} />);
	expect(html).not.toContain("Loading");
	expect(html).toMatch(/aria-current="step"[^>]*>.*?Third/);
	expect(html).toMatch(/data-step="third" role="group"[^>]*>.*?Third/);
	expect(callbacks.onChange).not.toHaveBeenCalled();
	expect(callbacks.onInvalidStep).not.toHaveBeenCalled();
});

it("renderToStream sends the fallback first, then the resumed flow", async () => {
	const chunks: string[] = [];
	await renderToStream(() => <Resumed onChange={() => {}} onInvalidStep={() => {}} />).pipeTo(
		new WritableStream({
			write: (chunk: unknown) => {
				chunks.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk as Uint8Array));
			},
		}),
	);
	expect(chunks[0]).toContain("Loading");
	const html = chunks.join("");
	expect(html).toMatch(/aria-current="step"[^>]*>.*?Third/);
});

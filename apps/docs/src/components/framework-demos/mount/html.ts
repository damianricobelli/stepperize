import { createStepper } from "@stepperize/core";
import { bindStepper } from "@stepperize/core/dom";

const steps = [
	{ id: "account", title: "Account", description: "Who you are" },
	{ id: "plan", title: "Plan", description: "What you need" },
	{ id: "done", title: "Done", description: "All set" },
] as const;

const trigger =
	"flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left data-[state=current]:border-fd-primary data-[state=current]:bg-fd-accent";
const indicator =
	"flex size-6 shrink-0 items-center justify-center rounded-full border text-xs data-[state=complete]:bg-fd-primary data-[state=complete]:text-fd-primary-foreground";
const panel = "rounded-md bg-fd-muted p-3";

// What a server template would have rendered. Nothing below this string creates markup.
const html = `
<div data-component="stepper" data-demo="html" class="not-prose my-4 flex flex-col gap-4 rounded-lg border p-4 text-sm">
	<ol data-component="stepper-list" class="flex gap-2">
		${steps
			.map(
				(step, index) => `
		<li data-component="stepper-item" data-step="${step.id}" class="flex-1">
			<button data-component="stepper-trigger" class="${trigger}">
				<span data-component="stepper-indicator" class="${indicator}">${index + 1}</span>
				<span class="flex flex-col">
					<span data-component="stepper-title" class="font-medium"></span>
					<span data-component="stepper-description" class="text-xs text-fd-muted-foreground"></span>
				</span>
			</button>
		</li>`,
			)
			.join("")}
	</ol>
	<div data-component="stepper-content" data-step="account" class="${panel}">Create your account.</div>
	<div data-component="stepper-content" data-step="plan" class="${panel}" hidden>Pick the plan that fits.</div>
	<div data-component="stepper-content" data-step="done" class="${panel}" hidden data-done>Press Finish to complete the flow.</div>
	<div class="flex items-center gap-2">
		<button data-component="stepper-prev" class="rounded-md border px-3 py-1 disabled:opacity-40">Back</button>
		<button data-component="stepper-next" class="rounded-md border px-3 py-1 aria-disabled:opacity-40">Continue</button>
		<span data-step-count class="ml-auto text-xs text-fd-muted-foreground"></span>
	</div>
</div>`;

export function mount(el: HTMLElement) {
	el.innerHTML = html;
	const root = el.firstElementChild as HTMLElement;
	const flow = createStepper(steps);
	const unbind = bindStepper(root, flow);
	// The parts are bound; anything else on the page reads the flow.
	const paint = () => {
		const count = root.querySelector("[data-step-count]");
		const done = root.querySelector("[data-done]");
		const next = root.querySelector('[data-component="stepper-next"]');
		if (count)
			count.textContent = `Step ${flow.index + 1} of ${flow.steps.length}`;
		if (next) next.textContent = flow.isLast ? "Finish" : "Continue";
		if (done)
			done.textContent = flow.isFinished
				? "Finished. Thanks!"
				: "Press Finish to complete the flow.";
	};
	const unsubscribe = flow.subscribe(paint);
	paint();
	return () => {
		unsubscribe();
		unbind();
		flow.destroy();
		el.innerHTML = "";
	};
}

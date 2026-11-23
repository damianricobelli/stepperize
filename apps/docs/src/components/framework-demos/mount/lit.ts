import { defineStepper } from "@stepperize/lit";
import { html, LitElement } from "lit";

const demo = defineStepper([
	{ id: "account", title: "Account", description: "Who you are" },
	{ id: "plan", title: "Plan", description: "What you need" },
	{ id: "done", title: "Done", description: "All set" },
]);

const TAG = "stepperize-lit-demo";

class LitDemo extends LitElement {
	stepper = demo.controller(this);

	// Light DOM, so the page's utility classes style it like the other demos.
	protected createRenderRoot() {
		return this;
	}

	render() {
		const s = this.stepper;
		const stepper = s.value;
		const panel = "rounded-md bg-fd-muted p-3";
		return html`
			<div ${s.root()} data-demo="lit" class="not-prose my-4 flex flex-col gap-4 rounded-lg border p-4 text-sm">
				<ol ${s.list()} class="flex gap-2">
					${s.steps.map(
						(step, index) => html`
							<li ${s.item(step.id)} class="flex-1">
								<button
									${s.trigger(step.id)}
									class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left data-[state=current]:border-fd-primary data-[state=current]:bg-fd-accent"
								>
									<span
										${s.indicator(step.id)}
										class="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs data-[state=complete]:bg-fd-primary data-[state=complete]:text-fd-primary-foreground"
										>${index + 1}</span
									>
									<span class="flex flex-col">
										<span class="font-medium">${step.title}</span>
										<span class="text-xs text-fd-muted-foreground">${step.description}</span>
									</span>
								</button>
							</li>
						`,
					)}
				</ol>
				<div ${s.content("account")} class=${panel}>Create your account.</div>
				<div ${s.content("plan")} class=${panel}>Pick the plan that fits.</div>
				<div ${s.content("done")} class=${panel}>
					${stepper.isFinished ? "Finished. Thanks!" : "Press Finish to complete the flow."}
				</div>
				<div class="flex items-center gap-2">
					<button ${s.prev()} class="rounded-md border px-3 py-1 disabled:opacity-40">Back</button>
					<button ${s.next()} class="rounded-md border px-3 py-1 aria-disabled:opacity-40">
						${stepper.isLast ? "Finish" : "Continue"}
					</button>
					<span data-step class="ml-auto text-xs text-fd-muted-foreground">
						Step ${stepper.index + 1} of ${stepper.steps.length}
					</span>
				</div>
			</div>
		`;
	}
}

export function mount(el: HTMLElement) {
	if (!customElements.get(TAG)) customElements.define(TAG, LitDemo);
	const element = document.createElement(TAG);
	el.appendChild(element);
	return () => element.remove();
}

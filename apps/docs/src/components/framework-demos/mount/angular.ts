// The docs are not an Angular application, so there is no Angular compiler in the build: the
// demo loads the JIT compiler and declares its component with the function form of `Component`.
import "@angular/compiler";
import { Component, signal } from "@angular/core";
import { bootstrapApplication } from "@angular/platform-browser";
import { defineStepper, STEPPER_PRIMITIVES } from "@stepperize/angular";

const demo = defineStepper([
	{ id: "account", title: "Account", description: "Who you are" },
	{ id: "plan", title: "Plan", description: "What you need" },
	{ id: "done", title: "Done", description: "All set" },
]);

const TAG = "stepperize-angular-demo";
const panel = "rounded-md bg-fd-muted p-3";

const AngularDemo = Component({
	selector: TAG,
	imports: [STEPPER_PRIMITIVES],
	template: `
		<div
			[stepperRoot]="stepper"
			data-demo="angular"
			class="not-prose my-4 flex flex-col gap-4 rounded-lg border p-4 text-sm"
		>
			<ol stepperList class="flex gap-2">
				@for (step of stepper.steps; track step.id; let index = $index) {
					<li [stepperItem]="step.id" class="flex-1">
						<button
							stepperTrigger
							class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left data-[state=current]:border-fd-primary data-[state=current]:bg-fd-accent"
						>
							<span
								stepperIndicator
								class="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs data-[state=complete]:bg-fd-primary data-[state=complete]:text-fd-primary-foreground"
								>{{ index + 1 }}</span
							>
							<span class="flex flex-col">
								<span class="font-medium">{{ step.title }}</span>
								<span class="text-xs text-fd-muted-foreground">{{ step.description }}</span>
							</span>
						</button>
					</li>
				}
			</ol>
			<div stepperContent="account" class="${panel}">Create your account.</div>
			<div stepperContent="plan" class="${panel}">Pick the plan that fits.</div>
			<div stepperContent="done" class="${panel}">
				{{ finished() ? "Finished. Thanks!" : "Press Finish to complete the flow." }}
			</div>
			<div class="flex items-center gap-2">
				<button stepperPrev class="rounded-md border px-3 py-1 disabled:opacity-40">Back</button>
				<button stepperNext class="rounded-md border px-3 py-1 aria-disabled:opacity-40">
					{{ stepper().isLast ? "Finish" : "Continue" }}
				</button>
				<span data-step class="ml-auto text-xs text-fd-muted-foreground">
					Step {{ stepper().index + 1 }} of {{ stepper().steps.length }}
				</span>
			</div>
		</div>
	`,
})(
	class {
		readonly finished = signal(false);
		readonly stepper = demo.injectStepper({
			onFinish: () => this.finished.set(true),
			onChange: () => this.finished.set(false),
		});
	},
);

export function mount(el: HTMLElement) {
	// `bootstrapApplication` renders into the first element that matches the selector.
	const host = document.createElement(TAG);
	el.appendChild(host);
	const application = bootstrapApplication(AngularDemo);
	return () => {
		void application.then((ref) => ref.destroy());
		host.remove();
	};
}

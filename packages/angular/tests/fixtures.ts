import { Component, input, signal } from "@angular/core";
import { defineStepper, type Options, STEPPER_PRIMITIVES } from "@stepperize/angular";

export const steps = [
	{ id: "first", title: "First", description: "Start here" },
	{ id: "second", title: "Second", description: "Then this" },
	{ id: "third", title: "Third", description: "Finish" },
] as const;
export const flow = defineStepper(steps);
export type StepOptions = Options<typeof steps>;

const schema = {
	"~standard": {
		version: 1 as const,
		vendor: "test",
		validate: (value: unknown) => (value === "ok" ? { value } : { issues: [{ message: "Required" }] }),
	},
};
export const checked = defineStepper([
	{ id: "a", title: "A", schema },
	{ id: "b", title: "B" },
]);

/** The whole stepper in one component. Every flow option arrives through one input. */
@Component({
	selector: "sz-full",
	imports: [STEPPER_PRIMITIVES],
	template: `
		<div [stepperRoot]="stepper">
			<ol stepperList>
				@for (step of stepper.steps; track step.id) {
					<li [stepperItem]="step.id">
						<button stepperTrigger>
							<span stepperIndicator></span>
							<span>{{ step.title }}</span>
							<span>{{ step.description }}</span>
						</button>
					</li>
				}
			</ol>
			@for (step of stepper.steps; track step.id) {
				<div [stepperContent]="step.id">
					<label>{{ step.title }} name <input /></label>
				</div>
			}
			<button stepperPrev>Back</button>
			<button stepperNext>Continue</button>
		</div>
	`,
})
export class Full {
	readonly options = input<StepOptions>({});
	readonly stepper = flow.injectStepper(() => this.options());
}

/** Two steppers on one page, for the server and hydration tests. */
@Component({
	selector: "sz-pair",
	imports: [Full],
	template: `<sz-full [options]="second" /><sz-full />`,
})
export class Pair {
	readonly second: StepOptions = { snapshot: { step: "second", complete: ["first"] } };
}

/** One template for the smaller scenarios, chosen by `name`. */
@Component({
	selector: "sz-scenario",
	imports: [STEPPER_PRIMITIVES, Full],
	template: `
		@switch (name()) {
			@case ("nested") {
				<div [stepperRoot]="stepper" data-testid="outer">
					<ol stepperList>
						@for (step of stepper.steps; track step.id) {
							<li [stepperItem]="step.id"><span stepperIndicator></span></li>
						}
					</ol>
					<div stepperContent="first"><sz-full /></div>
				</div>
			}
			@case ("late") {
				<div [stepperRoot]="stepper">
					<ol stepperList>
						<li stepperItem="first">
							@if (show()) {
								<button stepperTrigger>First</button>
							}
						</li>
					</ol>
				</div>
			}
			@case ("checked") {
				<div [stepperRoot]="checked">
					<ol stepperList>
						@for (step of checked.steps; track step.id) {
							<li [stepperItem]="step.id">
								<button stepperTrigger><span stepperIndicator></span>{{ step.title }}</button>
							</li>
						}
					</ol>
				</div>
			}
			@case ("badge") {
				<div [stepperRoot]="stepper">
					<ol stepperList>
						@for (step of stepper.steps; track step.id) {
							<li [stepperItem]="step.id" #item="stepperItem">
								<span [attr.data-testid]="'badge-' + step.id"
									>{{ item.value().index + 1 }} {{ item.value().state }} {{ item.value().disabled }}
									{{ item.value().pending }}</span
								>
							</li>
						}
					</ol>
				</div>
			}
			@case ("prevent") {
				<div [stepperRoot]="stepper" orientation="vertical" class="mine" data-extra="yes" aria-label="Checkout">
					<output>{{ stepper().current.id }}</output>
					<ol stepperList (keydown)="$event.preventDefault()">
						@for (step of stepper.steps; track step.id) {
							<li [stepperItem]="step.id"><button stepperTrigger>{{ step.title }}</button></li>
						}
					</ol>
					<button stepperNext (click)="$event.preventDefault()">Continue</button>
				</div>
			}
			@case ("panels") {
				<div [stepperRoot]="stepper">
					<div stepperContent="first"><input aria-label="Name" /></div>
					<div stepperContent="second">Two</div>
					@if (stepper().current.id === "third") {
						<div stepperContent="third">Three</div>
					}
				</div>
			}
			@case ("own") {
				<section [stepperRoot]="stepper">
					<nav stepperList>
						<div stepperItem="first"><a href="#first" stepperTrigger>First</a></div>
						<a href="#second" stepperTrigger="second">Second</a>
					</nav>
					<button type="submit" class="mine" stepperNext>Continue</button>
					<button stepperPrev disabled>Back</button>
				</section>
			}
			@case ("nameless") {
				<div [stepperRoot]="stepper"><div stepperItem="first"><button stepperTrigger></button></div></div>
			}
			@case ("rootless") {
				<button stepperNext>Continue</button>
			}
			@case ("unknown") {
				<div [stepperRoot]="stepper"><li stepperItem="nope"></li></div>
			}
			@case ("itemless") {
				<div [stepperRoot]="stepper"><span stepperIndicator></span></div>
			}
		}
	`,
})
export class Scenario {
	readonly name = input.required<string>();
	readonly show = signal(false);
	readonly options = input<StepOptions>({});
	readonly stepper = flow.injectStepper(() => this.options());
	readonly checked = checked.injectStepper();
}

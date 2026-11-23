// Compiled on its own by templates.test.ts, with `strictTemplates`: the primitives through an NgModule,
// for applications that still declare their components in one. Nothing here may fail to compile.
import { Component, NgModule } from "@angular/core";
import { defineStepper, STEPPER_PRIMITIVES } from "@stepperize/angular";

const checkout = defineStepper([
	{ id: "shipping", title: "Shipping" },
	{ id: "payment", title: "Payment" },
]);

@Component({
	selector: "app-declared",
	standalone: false,
	template: `
		<div [stepperRoot]="stepper">
			<ol stepperList>
				@for (step of stepper.steps; track step.id) {
					<li [stepperItem]="step" #item="stepperItem">
						<button stepperTrigger>{{ item.value().step.title }}</button>
					</li>
				}
			</ol>
			<div stepperContent="shipping"></div>
			<button stepperPrev>Back</button>
			<button stepperNext>Continue</button>
		</div>
	`,
})
export class Declared {
	readonly stepper = checkout.injectStepper();
}

@NgModule({ imports: [STEPPER_PRIMITIVES], declarations: [Declared], exports: [Declared] })
export class CheckoutModule {}

// Typo checks still run in a declared component: this one must fail, so the test knows the module's
// directives were seen by the template type-checker at all.
@Component({
	selector: "app-declared-typo",
	standalone: false,
	template: `<div [stepperRoot]="stepper"><li stepperItem="x" #item="stepperItem">{{ item.value().step.colour }}</li></div>`,
})
export class DeclaredTypo {
	readonly stepper = checkout.injectStepper();
}

@NgModule({ imports: [STEPPER_PRIMITIVES], declarations: [DeclaredTypo] })
export class TypoModule {}

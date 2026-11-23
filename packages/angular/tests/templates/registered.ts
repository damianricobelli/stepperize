// Compiled on its own by templates.test.ts, with `strictTemplates`: every line marked `error` must be
// reported by Angular's template type-checker, and nothing else.
import { Component } from "@angular/core";
import { defineStepper, STEPPER_PRIMITIVES } from "@stepperize/angular";

export const checkout = defineStepper([
	{ id: "shipping", title: "Shipping", icon: "truck" },
	{ id: "payment", title: "Payment", icon: "card" },
]);

declare module "@stepperize/angular" {
	interface StepperRegistry {
		checkout: typeof checkout;
	}
}

@Component({
	selector: "app-registered",
	imports: [STEPPER_PRIMITIVES],
	template: `
		<div [stepperRoot]="stepper">
			<ol stepperList>
				<li stepperItem="shipping" #shipping="stepperItem">
					<button stepperTrigger>{{ shipping.value().step.icon }}</button>
					<span stepperIndicator></span>
				</li>
				@for (step of stepper.steps; track step.id) {
					<li [stepperItem]="step" #item="stepperItem">{{ item.value().step.icon }}</li>
					<li [stepperItem]="step.id" #byId="stepperItem">{{ byId.value().step.icon }}</li>
				}
				<li stepperItem="paymnt"></li>
				<li stepperItem="payment" #payment="stepperItem">{{ payment.value().step.colour }}</li>
			</ol>
			<button stepperTrigger="payment">Payment</button>
			<button stepperTrigger="shiping">Shipping</button>
			<span stepperIndicator="paymet"></span>
			<div stepperContent="shipping"></div>
			<div stepperContent="shiping"></div>
			<div [stepperContent]="stepper().current.id"></div>
			<button stepperPrev>Back</button>
			<button stepperNext>Continue</button>
		</div>
	`,
})
export class Registered {
	readonly stepper = checkout.injectStepper();
}

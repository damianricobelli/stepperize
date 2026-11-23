// Compiled on its own by templates.test.ts, with `strictTemplates`. Nothing is registered: ids are
// strings, and an item bound to a step still types that step's fields.
import { Component } from "@angular/core";
import { defineStepper, STEPPER_PRIMITIVES } from "@stepperize/angular";

const checkout = defineStepper([
	{ id: "shipping", title: "Shipping", icon: "truck" },
	{ id: "payment", title: "Payment", icon: "card" },
]);

@Component({
	selector: "app-unregistered",
	imports: [STEPPER_PRIMITIVES],
	template: `
		<div [stepperRoot]="stepper">
			<ol stepperList>
				@for (step of stepper.steps; track step.id) {
					<li [stepperItem]="step" #item="stepperItem">{{ item.value().step.icon }}</li>
					<li [stepperItem]="step" #typo="stepperItem">{{ typo.value().step.colour }}</li>
				}
				<li stepperItem="anything" #loose="stepperItem">{{ loose.value().step.id }}</li>
			</ol>
			<div stepperContent="anything"></div>
			<div [stepperContent]="42"></div>
		</div>
	`,
})
export class Unregistered {
	readonly stepper = checkout.injectStepper();
}

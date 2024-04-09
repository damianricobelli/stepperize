"use client";

import StepperClickableSteps from "@/examples/stepper-clickable-steps";
import StepperCustomIcons from "@/examples/stepper-custom-icons";
import StepperCustomStyles from "@/examples/stepper-custom-styles";
import StepperDemo from "@/examples/stepper-demo";
import StepperFooterInside from "@/examples/stepper-footer-inside";
import StepperForm from "@/examples/stepper-form";
import StepperOptionalSteps from "@/examples/stepper-optional-steps";
import StepperOrientation from "@/examples/stepper-orientation";
import StepperSizes from "@/examples/stepper-sizes";
import StepperState from "@/examples/stepper-state";
import StepperVariants from "@/examples/stepper-variants";

export function StepperExamples() {
	return (
		<div className="w-full space-y-8">
			<div className="flex flex-col gap-4">
				<p className="font-semibold">Default</p>
				<StepperDemo />
			</div>
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<p className="font-semibold">Orientation</p>
					<p className="text-muted-foreground">
						You can change the orientation of the stepper to horizontal or
						vertical.
					</p>
				</div>
				<StepperOrientation />
			</div>
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<p className="font-semibold">Optional steps</p>
					<p className="text-muted-foreground">
						The second step is optional and can be skipped by the user.
					</p>
				</div>
				<StepperOptionalSteps />
			</div>
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<p className="font-semibold">Variants</p>
					<p className="text-muted-foreground">
						You can change the style of the stepper by passing the variant prop
					</p>
				</div>
				<StepperVariants />
			</div>
			<div className="flex flex-col gap-4">
				<p className="font-semibold">Sizes</p>
				<StepperSizes />
			</div>
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<p className="font-semibold">Responsive</p>
					<p className="text-muted-foreground">
						By using the orientation prop you are able to switch between
						horizontal (default) and vertical orientations. By default, when in
						mobile view the Steps component will switch to vertical orientation.
						You are also able to customize the breakpoint at which the component
						switches to vertical orientation by using the mobileBreakpoint prop.
					</p>
				</div>
			</div>
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<p className="font-semibold">State</p>
					<p className="text-muted-foreground">
						Sometimes it is useful to display visual feedback to the user
						depending on some asynchronous logic. In this case we can use the
						state prop to display a loading or error indicator with the values
						of loading | error. This prop can be used globally within the
						Stepper component or locally in the Step component affected by this
						state.
					</p>
				</div>
				<StepperState />
			</div>
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<p className="font-semibold">Custom Icons</p>
					<p className="text-muted-foreground">
						If you want to show custom icons instead of the default numerical
						indicators, you can do so by using the icon prop on the Step
						component. To change the general check and error icons, we can use
						the `checkIcon` and `errorIcon` prop inside the Stepper component
					</p>
				</div>
				<StepperCustomIcons />
			</div>
			<div className="flex flex-col gap-4">
				<p className="font-semibold">Clickable Steps</p>
				<StepperClickableSteps />
			</div>
			<div className="flex flex-col gap-4">
				<p className="font-semibold">Footer inside the step</p>
				<StepperFooterInside />
			</div>
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<p className="font-semibold">Scroll Tracking</p>
					<p className="text-muted-foreground">
						If you would like the stepper to scroll to the active step when it
						is not in view you can do so using the scrollTracking prop on the
						Stepper component.
					</p>
				</div>
			</div>
			<div className="flex flex-col gap-4">
				<div className="space-y-1">
					<p className="font-semibold">With Forms</p>
					<p className="text-muted-foreground">
						If you want to use the stepper with forms, you can do so by using
						the useStepper hook to control the component. This example uses the
						Form component of shadcn and the react-hook-form hooks to create a
						form with zod for validations. You can also use the component with
						server actions.
					</p>
				</div>
				<StepperForm />
			</div>
			<div className="flex flex-col gap-4">
				<p className="font-semibold">Custom styles</p>
				<StepperCustomStyles />
			</div>
		</div>
	);
}

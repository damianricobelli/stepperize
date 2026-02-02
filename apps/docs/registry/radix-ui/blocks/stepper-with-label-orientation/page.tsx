import { StepperWithLabelOrientation } from "@/registry/radix-ui/blocks/stepper-with-label-orientation/components/stepper-with-label-orientation";

export default async function Page() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-2xl px-4">
				<StepperWithLabelOrientation />
			</div>
		</div>
	);
}

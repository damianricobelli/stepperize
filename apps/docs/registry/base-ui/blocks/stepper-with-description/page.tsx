import { StepperWithDescription } from "@/registry/base-ui/blocks/stepper-with-description/components/stepper-with-description";

export default async function Page() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-2xl px-4">
				<StepperWithDescription />
			</div>
		</div>
	);
}

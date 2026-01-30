import { StepperWithScrollTracking } from "@/registry/base-ui/blocks/stepper-with-scroll-tracking/components/stepper-with-scroll-tracking";

export default async function Page() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-2xl px-4">
				<StepperWithScrollTracking />
			</div>
		</div>
	);
}

import { StepperDemo } from "@/registry/radix-ui/blocks/stepper-demo/components/stepper-demo";

export default async function Page() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-2xl px-4">
				<StepperDemo />
			</div>
		</div>
	);
}

import { StepperWithVariants } from "@/registry/radix-ui/blocks/stepper-with-variants/components/stepper-with-variants";

export default async function Page() {
	return (
		<div className="flex min-h-screen items-center justify-center">
			<div className="w-full max-w-2xl px-4">
				<StepperWithVariants />
			</div>
		</div>
	);
}

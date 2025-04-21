import { StepperWithResponsiveVariant } from "@/registry/new-york/blocks/stepper-with-responsive-variant/components/stepper-with-responsive-variant";

export default async function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-2xl px-4">
        <StepperWithResponsiveVariant />
      </div>
    </div>
  );
}

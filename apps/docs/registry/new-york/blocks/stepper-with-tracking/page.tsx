import { StepperWithTracking } from "@/registry/new-york/blocks/stepper-with-tracking/components/stepper-with-tracking";

export default async function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-2xl px-4">
        <StepperWithTracking />
      </div>
    </div>
  );
}

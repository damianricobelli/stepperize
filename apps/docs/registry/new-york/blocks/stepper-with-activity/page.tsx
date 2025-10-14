import { StepperWithActivity } from "@/registry/new-york/blocks/stepper-with-activity/components/stepper-with-activity";

export default async function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-2xl px-4">
        <StepperWithActivity />
      </div>
    </div>
  );
}

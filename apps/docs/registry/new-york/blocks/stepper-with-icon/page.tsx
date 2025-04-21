import { StepperWithIcon } from "@/registry/new-york/blocks/stepper-with-icon/components/stepper-with-icon";

export default async function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-2xl px-4">
        <StepperWithIcon />
      </div>
    </div>
  );
}

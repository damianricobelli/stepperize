import { defineStepper } from "@stepperize/react";
import { Check } from "lucide-react";
import { useState } from "react";

const { Stepper } = defineStepper([
  { id: "profile", title: "Profile", description: "Tell us about you" },
  { id: "workspace", title: "Workspace", description: "Name your workspace" },
  { id: "billing", title: "Billing", description: "Add a payment method" },
  { id: "review", title: "Review", description: "Confirm and finish" },
]);

export function VerticalStepperBlock() {
  const [finished, setFinished] = useState(false);

  return (
    <Stepper.Root
      orientation="vertical"
      className="w-full max-w-2xl rounded-xl border bg-background p-6 shadow-sm"
    >
      {({ stepper }) => (
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-8">
          {/* Sidebar rail — vertical step navigation */}
          <Stepper.List
            orientation="vertical"
            className="flex shrink-0 flex-col sm:w-48"
          >
            <Stepper.Items>
              {(step, index) => (
                <Stepper.Item
                  key={step.id}
                  step={step.id}
                  className="group/item relative pb-6 pl-9 last:pb-0"
                >
                  {index < stepper.count - 1 && (
                    <div className="absolute top-7 bottom-1 left-3.25 w-px bg-border group-data-[status=previous]/item:bg-primary" />
                  )}
                  <Stepper.Trigger className="flex items-start gap-3 text-left">
                    <Stepper.Indicator className="group absolute left-0 grid size-7 place-items-center rounded-full border bg-background text-xs font-semibold transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary data-[status=previous]:bg-primary data-[status=previous]:text-primary-foreground data-[status=upcoming]:border-border data-[status=upcoming]:text-muted-foreground">
                      <span className="group-data-[status=previous]:hidden">
                        {index + 1}
                      </span>
                      <Check className="hidden size-3.5 group-data-[status=previous]:block" />
                    </Stepper.Indicator>
                    <span>
                      <Stepper.Title className="block text-sm font-medium leading-none" />
                      <Stepper.Description className="mt-1 block text-xs text-muted-foreground" />
                    </span>
                  </Stepper.Trigger>
                </Stepper.Item>
              )}
            </Stepper.Items>
          </Stepper.List>

          {/* Long-form content panel */}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">
              Step {stepper.index + 1} of {stepper.count}
            </p>
            <h3 className="mt-1 text-lg font-semibold">
              {finished ? "Setup finished" : stepper.current.title}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {finished
                ? "Profile, workspace, billing, and review are complete."
                : stepper.current.description}
            </p>

            <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm text-muted-foreground">
              {finished
                ? "The completion state keeps the user oriented after the final action."
                : `Put the ${stepper.current.title.toLowerCase()} fields here. The rail stays fixed while this column scrolls independently on long forms.`}
            </div>

            <Stepper.Actions className="mt-6 flex gap-2">
              <Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
                Back
              </Stepper.Prev>
							{finished ? (
								<button
									type="button"
									onClick={() => {
										setFinished(false);
										stepper.reset();
									}}
									className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Restart flow
								</button>
							) : stepper.isLast ? (
								<button
									type="button"
									onClick={() => setFinished(true)}
                  className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Finish setup
                </button>
              ) : (
                <Stepper.Next className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
                  Continue
                </Stepper.Next>
              )}
            </Stepper.Actions>
          </div>
        </div>
      )}
    </Stepper.Root>
  );
}

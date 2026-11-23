/** @jsxImportSource solid-js */
import { defineStepper } from "@stepperize/solid";
import { Show } from "solid-js";

const { Stepper } = defineStepper([
	{ id: "account", title: "Account", description: "Who you are" },
	{ id: "plan", title: "Plan", description: "What you need" },
	{ id: "done", title: "Done", description: "All set" },
]);

export default function SolidDemo() {
	return (
		<Stepper.Root
			class="not-prose my-4 flex flex-col gap-4 rounded-lg border p-4 text-sm"
			data-demo="solid"
		>
			{(stepper) => (
				<>
					<Stepper.List class="flex gap-2">
						{(_step, index) => (
							<Stepper.Item class="flex-1">
								<Stepper.Trigger class="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left data-[state=current]:border-fd-primary data-[state=current]:bg-fd-accent">
									<Stepper.Indicator class="flex size-6 shrink-0 items-center justify-center rounded-full border text-xs data-[state=complete]:bg-fd-primary data-[state=complete]:text-fd-primary-foreground">
										{index + 1}
									</Stepper.Indicator>
									<span class="flex flex-col">
										<Stepper.Title class="font-medium" />
										<Stepper.Description class="text-xs text-fd-muted-foreground" />
									</span>
								</Stepper.Trigger>
							</Stepper.Item>
						)}
					</Stepper.List>

					<Stepper.Content step="account" class="rounded-md bg-fd-muted p-3">
						Create your account.
					</Stepper.Content>
					<Stepper.Content step="plan" class="rounded-md bg-fd-muted p-3">
						Pick the plan that fits.
					</Stepper.Content>
					<Stepper.Content step="done" class="rounded-md bg-fd-muted p-3">
						<Show
							when={stepper.isFinished}
							fallback="Press Finish to complete the flow."
						>
							Finished. Thanks!
						</Show>
					</Stepper.Content>

					<div class="flex items-center gap-2">
						<Stepper.Prev class="rounded-md border px-3 py-1 disabled:opacity-40">
							Back
						</Stepper.Prev>
						<Stepper.Next class="rounded-md border px-3 py-1 aria-disabled:opacity-40">
							{stepper.isLast ? "Finish" : "Continue"}
						</Stepper.Next>
						<span data-step class="ml-auto text-xs text-fd-muted-foreground">
							Step {stepper.index + 1} of {stepper.steps.length}
						</span>
					</div>
				</>
			)}
		</Stepper.Root>
	);
}

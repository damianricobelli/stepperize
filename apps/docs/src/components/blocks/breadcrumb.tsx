import { defineStepper } from "@stepperize/react";
import { ChevronRight } from "lucide-react";
import { Fragment, useState } from "react";

const { Stepper } = defineStepper([
	{ id: "type", title: "Type" },
	{ id: "details", title: "Details" },
	{ id: "media", title: "Media" },
	{ id: "publish", title: "Publish" },
]);

export function BreadcrumbBlock() {
	const [published, setPublished] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<>
					<Stepper.List className="flex flex-wrap items-center gap-0.5 text-sm">
						<Stepper.Items>
							{(step, index) => (
								<Fragment key={step.id}>
									{index > 0 && (
										<ChevronRight className="size-4 shrink-0 text-muted-foreground/50" />
									)}
									<Stepper.Item step={step.id}>
										<Stepper.Trigger className="rounded-md px-2 py-1 font-medium text-muted-foreground transition-colors enabled:hover:bg-muted enabled:hover:text-foreground disabled:opacity-100 data-[status=active]:text-primary data-[status=previous]:text-foreground">
											<Stepper.Title />
										</Stepper.Trigger>
									</Stepper.Item>
								</Fragment>
							)}
						</Stepper.Items>
					</Stepper.List>

					<div className="mt-6 grid min-h-24 place-items-center rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
						{published ? (
							<div>
								<p className="font-medium text-foreground">Content published</p>
								<p className="mt-1 text-xs">
									Type, details, media, and publishing are complete.
								</p>
							</div>
						) : (
							<Stepper.Content step={stepper.current.id}>
								Editing “{stepper.current.title}”.
							</Stepper.Content>
						)}
					</div>

					<Stepper.Actions className="mt-6 flex justify-between">
						<Stepper.Prev className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50">
							Back
						</Stepper.Prev>
						{published ? (
							<button
								type="button"
								onClick={() => {
									setPublished(false);
									stepper.reset();
								}}
								className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Restart flow
							</button>
						) : stepper.isLast ? (
							<button
								type="button"
								onClick={() => setPublished(true)}
								className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
							>
								Publish
							</button>
						) : (
							<Stepper.Next className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
								Continue
							</Stepper.Next>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}

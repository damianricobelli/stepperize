import { defineStepper } from "@stepperize/react";
import { Check, Loader2, Speaker, Wifi } from "lucide-react";
import { useState } from "react";

const { Stepper } = defineStepper([
	{ id: "discover", title: "Discover" },
	{ id: "pair", title: "Pair" },
	{ id: "configure", title: "Configure" },
	{ id: "ready", title: "Ready" },
]);

export function DevicePairingBlock() {
	const [finished, setFinished] = useState(false);

	return (
		<Stepper.Root className="w-full max-w-sm overflow-hidden rounded-xl border bg-background shadow-sm">
			{({ stepper }) => (
				<>
					<div className="relative grid h-32 place-items-center bg-muted/40">
						<Stepper.Content step="discover">
							<span className="relative grid size-16 place-items-center">
								<span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
								<Wifi className="relative size-9 text-primary" />
							</span>
						</Stepper.Content>
						<Stepper.Content step="pair">
							<Loader2 className="size-9 animate-spin text-primary" />
						</Stepper.Content>
						<Stepper.Content step="configure">
							<Speaker className="size-9 text-primary" />
						</Stepper.Content>
						<Stepper.Content step="ready">
							<span className="grid size-12 place-items-center rounded-full bg-chart-2/15 text-chart-2">
								<Check className="size-6" />
							</span>
						</Stepper.Content>
					</div>

					<div className="p-5">
						<div className="mb-3 flex items-center justify-between">
							<h3 className="text-sm font-semibold">{stepper.current.title}</h3>
							<Stepper.List className="flex gap-1.5">
								<Stepper.Items>
									{(step) => (
										<Stepper.Item key={step.id} step={step.id}>
											<Stepper.Indicator className="block size-1.5 rounded-full transition-colors data-[status=active]:bg-primary data-[status=previous]:bg-primary data-[status=upcoming]:bg-muted" />
										</Stepper.Item>
									)}
								</Stepper.Items>
							</Stepper.List>
						</div>

						<div className="min-h-14 text-sm text-muted-foreground">
							<Stepper.Content step="discover">
								Searching for nearby devices…
							</Stepper.Content>
							<Stepper.Content step="pair">
								Pairing with{" "}
								<b className="text-foreground">Living Room Speaker</b>…
							</Stepper.Content>
							<Stepper.Content step="configure" className="space-y-2">
								<input
									defaultValue="Living Room Speaker"
									className="h-9 w-full rounded-lg border bg-background px-3 text-sm text-foreground outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
								/>
							</Stepper.Content>
							<Stepper.Content step="ready">
								{finished
									? "Setup finished. Living Room Speaker is ready to play."
									: "Your device is connected and ready to use."}
							</Stepper.Content>
						</div>

						<Stepper.Actions className="mt-4 flex justify-between">
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
									Pair another
								</button>
							) : stepper.isLast ? (
								<button
									type="button"
									onClick={() => setFinished(true)}
									className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
								>
									Finish pairing
								</button>
							) : (
								<Stepper.Next className="inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50">
									{stepper.current.id === "discover" ? "Connect" : "Next"}
								</Stepper.Next>
							)}
						</Stepper.Actions>
					</div>
				</>
			)}
		</Stepper.Root>
	);
}

import { defineStepper } from "@stepperize/react";
import { Building2, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const { Stepper } = defineStepper([
	{ id: "workspace", title: "Workspace" },
	{ id: "branding", title: "Branding" },
	{ id: "members", title: "Members" },
]);

const SWATCHES = [
	"oklch(54.6% 0.2152 262.9)",
	"oklch(69.6% 0.1491 162.5)",
	"oklch(76.9% 0.1647 70.08)",
	"oklch(63.7% 0.2078 25.33)",
	"oklch(58.5% 0.2041 277.1)",
];

export function OrgSetupBlock() {
	const [created, setCreated] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
		>
			{({ stepper }) => (
				<>
					<Stepper.List className="flex gap-1 rounded-lg bg-muted p-1">
						<Stepper.Items>
							{(step) => (
								<Stepper.Item key={step.id} step={step.id} className="flex-1">
									<Stepper.Trigger className="w-full rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors disabled:cursor-not-allowed data-[status=active]:bg-background data-[status=active]:text-foreground data-[status=active]:shadow-sm data-[status=previous]:text-foreground">
										<Stepper.Title />
									</Stepper.Trigger>
								</Stepper.Item>
							)}
						</Stepper.Items>
					</Stepper.List>

					<div className="mt-6 min-h-32">
						<Stepper.Content step="workspace" className="space-y-3">
							<div className="flex items-center gap-3">
								<span className="grid size-11 place-items-center rounded-lg bg-primary/10 text-primary">
									<Building2 className="size-5" />
								</span>
								<p className="text-sm text-muted-foreground">
									Give your organization a name.
								</p>
							</div>
							<Input placeholder="Acme Inc." />
						</Stepper.Content>

						<Stepper.Content step="branding" className="space-y-3">
							<p className="text-sm font-medium">Accent color</p>
							<RadioGroup defaultValue={SWATCHES[0]} className="flex gap-2">
								{SWATCHES.map((color) => (
									<RadioGroupItem
										key={color}
										value={color}
										aria-label={color}
										className="size-8 rounded-full border-0 ring-offset-2 ring-offset-background data-checked:bg-(--swatch) data-checked:ring-2 data-checked:ring-foreground"
										style={
											{
												"--swatch": color,
												backgroundColor: color,
											} as React.CSSProperties
										}
									/>
								))}
							</RadioGroup>
							<p className="text-xs text-muted-foreground">
								Used across buttons, links, and highlights.
							</p>
						</Stepper.Content>

						<Stepper.Content step="members" className="space-y-2">
							{created ? (
								<div className="rounded-lg border bg-chart-2/10 p-4 text-sm">
									<p className="font-medium">Organization created</p>
									<p className="mt-1 text-muted-foreground">
										Your workspace, branding, and member setup are ready.
									</p>
								</div>
							) : (
								<div className="flex gap-2">
									<span className="flex h-8 flex-1 items-center gap-2 rounded-lg border bg-background px-3 text-sm text-muted-foreground">
										<Mail className="size-4" /> teammate@acme.com
									</span>
									<Button variant="outline">
										<UserPlus /> Invite
									</Button>
								</div>
							)}
							<p className="text-xs text-muted-foreground">
								2 seats included on your plan.
							</p>
						</Stepper.Content>
					</div>

					<Stepper.Actions className="mt-6 flex justify-between">
						<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
							Back
						</Stepper.Prev>
						{created ? (
							<button
								type="button"
								onClick={() => {
									setCreated(false);
									stepper.reset();
								}}
								className={buttonVariants()}
							>
								Start over
							</button>
						) : stepper.isLast ? (
							<button
								type="button"
								onClick={() => setCreated(true)}
								className={buttonVariants()}
							>
								Create organization
							</button>
						) : (
							<Stepper.Next className={buttonVariants()}>Continue</Stepper.Next>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}

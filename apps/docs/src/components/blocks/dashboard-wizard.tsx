import { defineStepper } from "@stepperize/react";
import { AlertTriangle, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const { Stepper } = defineStepper([
	{ id: "general", title: "General", hint: "Workspace name and URL" },
	{ id: "members", title: "Members", hint: "Invite your team" },
	{ id: "billing", title: "Billing", hint: "Plan and payment" },
	{ id: "review", title: "Review", hint: "Confirm changes" },
]);

const REQUIRED: Partial<Record<string, string>> = {
	general: "name",
	billing: "card",
};

export function DashboardWizardBlock() {
	const [values, setValues] = useState<Record<string, string>>({});
	const [error, setError] = useState<string | null>(null);
	const [dirty, setDirty] = useState(false);
	const [saved, setSaved] = useState(false);

	// Unsaved-changes guard: warn before the tab is closed while edits are pending.
	useEffect(() => {
		if (!dirty) return;
		const handler = (event: BeforeUnloadEvent) => event.preventDefault();
		window.addEventListener("beforeunload", handler);
		return () => window.removeEventListener("beforeunload", handler);
	}, [dirty]);

	return (
		<Stepper.Root
			linear
			// Per-step validation guard: block forward navigation until the active
			// step's required field is filled.
			beforeStepChange={async ({ from, direction }) => {
				if (direction !== "next") {
					setError(null);
					return true;
				}
				const field = REQUIRED[from.id];
				if (field && !values[`${from.id}.${field}`]?.trim()) {
					setError(`${from.title} needs a ${field} before continuing.`);
					return false;
				}
				setError(null);
				setDirty(false);
				return true;
			}}
			className="w-full max-w-2xl rounded-xl border bg-background shadow-sm"
		>
			{({ stepper }) => (
				<div className="flex flex-col sm:flex-row">
					{/* Sticky step nav */}
					<Stepper.List className="flex shrink-0 flex-col gap-1 border-b p-3 sm:w-52 sm:border-r sm:border-b-0">
						<Stepper.Items>
							{(step, index) => (
								<Stepper.Item key={step.id} step={step.id}>
									<Stepper.Trigger className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted data-[status=active]:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
										<Stepper.Indicator className="grid size-6 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors group-data-[status=active]:border-primary group-data-[status=active]:text-primary group-data-[status=previous]:border-primary group-data-[status=previous]:bg-primary group-data-[status=previous]:text-primary-foreground">
											<span className="group-data-[status=previous]:hidden">
												{index + 1}
											</span>
											<Check className="hidden size-3 group-data-[status=previous]:block" />
										</Stepper.Indicator>
										<span className="min-w-0">
											<Stepper.Title className="block truncate font-medium leading-none" />
											<span className="mt-0.5 block truncate text-xs text-muted-foreground">
												{step.hint}
											</span>
										</span>
									</Stepper.Trigger>
								</Stepper.Item>
							)}
						</Stepper.Items>
					</Stepper.List>

					{/* Content */}
					<div className="min-w-0 flex-1 p-6">
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-base font-semibold">
								{stepper.current.title}
							</h3>
							{dirty && (
								<Badge
									variant="secondary"
									className="bg-amber-500/15 text-amber-600"
								>
									<AlertTriangle />
									Unsaved changes
								</Badge>
							)}
						</div>

						<Stepper.Content step="general" className="space-y-3">
							<Field
								label="Workspace name"
								placeholder="Acme Inc."
								onChange={(v) => {
									setValues((s) => ({ ...s, "general.name": v }));
									setDirty(true);
								}}
							/>
						</Stepper.Content>
						<Stepper.Content
							step="members"
							className="text-sm text-muted-foreground"
						>
							Invite teammates by email (optional).
						</Stepper.Content>
						<Stepper.Content step="billing" className="space-y-3">
							<Field
								label="Card number"
								placeholder="4242 4242 4242 4242"
								onChange={(v) => {
									setValues((s) => ({ ...s, "billing.card": v }));
									setDirty(true);
								}}
							/>
						</Stepper.Content>
						<Stepper.Content
							step="review"
							className="text-sm text-muted-foreground"
						>
							{saved
								? "Changes saved. The workspace settings are up to date."
								: "Review your changes, then save."}
						</Stepper.Content>

						{error && (
							<Alert variant="destructive" className="mt-3">
								<AlertTriangle />
								<AlertDescription>{error}</AlertDescription>
							</Alert>
						)}

						<Stepper.Actions className="mt-6 flex gap-2">
							<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
								Back
							</Stepper.Prev>
							{saved ? (
								<button
									type="button"
									onClick={() => {
										setSaved(false);
										setValues({});
										setError(null);
										setDirty(false);
										stepper.reset();
									}}
									className={buttonVariants()}
								>
									Restart flow
								</button>
							) : stepper.isLast ? (
								<button
									type="button"
									onClick={() => {
										setSaved(true);
										setDirty(false);
									}}
									className={buttonVariants()}
								>
									Save changes
								</button>
							) : (
								<Stepper.Next className={buttonVariants()}>
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

function Field({
	label,
	placeholder,
	onChange,
}: {
	label: string;
	placeholder?: string;
	onChange: (value: string) => void;
}) {
	return (
		<div className="space-y-1.5">
			<Label>{label}</Label>
			<Input
				placeholder={placeholder}
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);
}

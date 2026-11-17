import { defineStepper } from "@stepperize/react";
import { Check } from "lucide-react";
import { z } from "zod";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

// The account step owns data, so it carries a schema. `next()` runs the stored
// values through it and only moves on when they pass.
const accountSchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.string().email("Enter a valid email"),
});

const onboarding = defineStepper(
	[
		{
			id: "account",
			title: "Account",
			description: "Your details",
			schema: accountSchema,
		},
		{ id: "preferences", title: "Preferences", description: "Make it yours" },
		{ id: "confirm", title: "Confirm", description: "Review & finish" },
	] as const,
	{
		snapshot: {
			data: { account: { name: "", email: "" } },
		},
	},
);

const { Stepper } = onboarding;

type Errors = Record<string, string>;

function toErrors(
	issues: ReadonlyArray<{
		message: string;
		path?: ReadonlyArray<unknown>;
	}> = [],
): Errors {
	const out: Errors = {};
	for (const issue of issues) {
		const seg = issue.path?.[0];
		const key =
			typeof seg === "object" && seg !== null
				? String((seg as { key: PropertyKey }).key)
				: String(seg ?? "_");
		out[key] ??= issue.message;
	}
	return out;
}

export function UserOnboardingBlock() {
	return (
		<Stepper.Root
			className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm"
			linear
			// `next()` on the last step finishes the flow, once: return the request
			// from `onFinish` and `stepper.isFinished` turns true when it settles.
			onFinish={(output) => console.info("Create account", output)}
		>
			{(stepper) => {
				const created = stepper.isFinished;
				return (
					<>
						<Stepper.List className="flex w-full">
							{(step, index) => (
								<Stepper.Item
									key={step.id}
									step={step.id}
									className="relative flex flex-1 justify-center"
								>
									{index < stepper.steps.length - 1 && (
										<hr className="absolute left-[calc(50%+1.125rem)] right-[calc(-50%+1.125rem)] top-[1.125rem] h-px bg-border" />
									)}
									<Stepper.Trigger className="relative z-10 flex max-w-32 flex-col items-center gap-2 text-center disabled:cursor-not-allowed">
										<Stepper.Indicator className="group grid size-9 shrink-0 place-items-center rounded-full border bg-background text-sm font-semibold transition-colors data-[state=current]:border-primary data-[state=current]:bg-primary data-[state=current]:text-primary-foreground data-[state=complete]:border-primary data-[state=complete]:bg-primary data-[state=complete]:text-primary-foreground data-[state=pending]:border-border data-[state=pending]:text-muted-foreground">
											<span className="group-data-[state=complete]:hidden">
												{index + 1}
											</span>
											<Check className="hidden size-4 group-data-[state=complete]:block" />
										</Stepper.Indicator>
										<span className="hidden min-w-0 sm:block">
											<Stepper.Title className="block truncate text-sm font-medium leading-none" />
											<Stepper.Description className="mt-1 block truncate text-xs text-muted-foreground" />
										</span>
									</Stepper.Trigger>
								</Stepper.Item>
							)}
						</Stepper.List>

						<div className="mt-6 min-h-36">
							<Stepper.Content step="account" className="space-y-3">
								<AccountFields />
							</Stepper.Content>

							<Stepper.Content step="preferences" className="space-y-3">
								<Toggle label="Product updates" defaultChecked />
								<Toggle label="Weekly digest" />
								<Toggle label="Beta features" defaultChecked />
							</Stepper.Content>

							<Stepper.Content step="confirm">
								<div className="rounded-lg border bg-muted/40 p-4 text-sm">
									<p className="font-medium">
										{created ? "Account created" : "You're all set 🎉"}
									</p>
									<p className="mt-1 text-muted-foreground">
										{created
											? "Your account is ready and preferences were saved."
											: "Review your details and create your account."}
									</p>
								</div>
							</Stepper.Content>
						</div>

						<div className="mt-6 flex justify-between">
							<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
								Back
							</Stepper.Prev>
							{created ? (
								<button
									type="button"
									onClick={() => stepper.reset()}
									className={buttonVariants()}
								>
									Start over
								</button>
							) : (
								<Stepper.Next className={buttonVariants()}>
									{stepper.isLast ? "Create account" : "Continue"}
								</Stepper.Next>
							)}
						</div>
					</>
				);
			}}
		</Stepper.Root>
	);
}

// Controlled fields write to `stepper.data`, which is what `next()` validates.
// `issues()` holds the result of the last failed attempt until the data changes.
function AccountFields() {
	const stepper = onboarding.useStepperContext();
	const errors = toErrors(stepper.issues("account"));
	const account = stepper.data.account ?? { name: "", email: "" };
	const set = (patch: Partial<typeof account>) =>
		stepper.setData("account", { ...account, ...patch });

	return (
		<>
			<Field
				label="Full name"
				placeholder="Ada Lovelace"
				value={account.name}
				error={errors.name}
				onChange={(event) => set({ name: event.target.value })}
			/>
			<Field
				label="Email"
				type="email"
				placeholder="ada@example.com"
				value={account.email}
				error={errors.email}
				onChange={(event) => set({ email: event.target.value })}
			/>
		</>
	);
}

function Field({
	label,
	error,
	...props
}: { label: string; error?: string } & React.ComponentProps<typeof Input>) {
	return (
		<div className="space-y-1.5">
			<Label>{label}</Label>
			<Input aria-invalid={error ? true : undefined} {...props} />
			{error && <p className="text-xs text-destructive">{error}</p>}
		</div>
	);
}

function Toggle({
	label,
	defaultChecked,
}: {
	label: string;
	defaultChecked?: boolean;
}) {
	return (
		<Label className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-normal">
			<span className="font-medium">{label}</span>
			<Switch defaultChecked={defaultChecked} />
		</Label>
	);
}

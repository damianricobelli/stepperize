import { defineStepper } from "@stepperize/react";
import { Camera, FileCheck, IdCard, UserRound } from "lucide-react";
import type { ComponentType } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Every step that gates the flow carries a schema, and `next()` validates it:
// the identity step checks its fields, the upload steps an acknowledgement.
const identitySchema = z.object({
	legalName: z.string().min(2, "Enter your legal name"),
	dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

const uploadSchema = z.object({
	confirmed: z
		.boolean()
		.refine((value) => value, "Confirm the upload before continuing."),
});

const kyc = defineStepper(
	[
		{
			id: "identity",
			title: "Identity",
			icon: UserRound,
			schema: identitySchema,
		},
		{ id: "document", title: "Document", icon: IdCard, schema: uploadSchema },
		{ id: "selfie", title: "Selfie", icon: Camera, schema: uploadSchema },
		{ id: "review", title: "Review", icon: FileCheck },
	] as const,
	{
		snapshot: {
			data: {
				identity: { legalName: "", dob: "" },
				document: { confirmed: false },
				selfie: { confirmed: false },
			},
		},
	},
);

const { Stepper } = kyc;

const icons: Record<
	string,
	ComponentType<{ className?: string }>
> = Object.fromEntries(
	[UserRound, IdCard, Camera, FileCheck].map((Icon, i) => [
		["identity", "document", "selfie", "review"][i],
		Icon,
	]),
);

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

export function KycVerificationBlock() {
	return (
		<Stepper.Root
			linear
			className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm"
			// `next()` on the last step finishes the flow, once: return the request
			// from `onFinish` and `stepper.isFinished` turns true when it settles.
			onFinish={(output) => console.info("Submit verification", output)}
		>
			{(stepper) => {
				// The issues of the last failed `next()`, until the step's data changes.
				const errors = toErrors(stepper.issues());
				const submitted = stepper.isFinished;
				return (
					<>
						<Stepper.List className="flex items-center justify-between">
							{(step, index) => {
								const Icon = icons[step.id];
								return (
									<div
										key={step.id}
										className="flex flex-1 flex-col items-center last:flex-none"
									>
										<div className="flex w-full items-center">
											<Stepper.Item
												step={step.id}
												className="flex flex-col items-center"
											>
												<Stepper.Trigger
													aria-label={step.title}
													className="disabled:cursor-not-allowed"
												>
													<Stepper.Indicator className="grid size-11 place-items-center rounded-xl border transition-colors data-[state=current]:border-primary data-[state=current]:bg-primary data-[state=current]:text-primary-foreground data-[state=complete]:border-primary data-[state=complete]:bg-primary/10 data-[state=complete]:text-primary data-[state=pending]:border-border data-[state=pending]:text-muted-foreground">
														<Icon className="size-5" />
													</Stepper.Indicator>
												</Stepper.Trigger>
												<Stepper.Title className="mt-2 text-xs font-medium" />
											</Stepper.Item>
											{index < stepper.steps.length - 1 && (
												<div className="-mt-6 mx-2 h-0.5 flex-1 rounded bg-border" />
											)}
										</div>
									</div>
								);
							}}
						</Stepper.List>

						<div className="mt-6 min-h-32 rounded-lg border bg-muted/30 p-4 text-sm">
							<Stepper.Content step="identity">
								<IdentityFields errors={errors} />
							</Stepper.Content>
							<Stepper.Content step="document">
								<UploadAck
									stepId="document"
									title="Upload your ID"
									hint="A passport or driver's license works best."
									label="I've uploaded a valid photo ID"
								/>
							</Stepper.Content>
							<Stepper.Content step="selfie">
								<UploadAck
									stepId="selfie"
									title="Take a selfie"
									hint="We match your face against your document."
									label="I've captured a clear selfie"
								/>
							</Stepper.Content>
							<Stepper.Content step="review">
								<p className="font-medium">
									{submitted ? "Verification submitted" : "Review & submit"}
								</p>
								<p className="mt-1 text-muted-foreground">
									{submitted
										? "We'll notify you when the review is complete."
										: "Confirm everything looks right before sending."}
								</p>
							</Stepper.Content>
						</div>

						{errors.confirmed && (
							<Alert variant="destructive" className="mt-3">
								<AlertDescription>{errors.confirmed}</AlertDescription>
							</Alert>
						)}

						<div className="mt-6 flex justify-between">
							<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
								Back
							</Stepper.Prev>
							{submitted ? (
								<button
									type="button"
									onClick={() => stepper.reset()}
									className={buttonVariants()}
								>
									Start over
								</button>
							) : (
								<Stepper.Next className={buttonVariants()}>
									{stepper.isLast ? "Submit verification" : "Next"}
								</Stepper.Next>
							)}
						</div>
					</>
				);
			}}
		</Stepper.Root>
	);
}

function IdentityFields({ errors }: { errors: Errors }) {
	const stepper = kyc.useStepperContext();
	const identity = stepper.data.identity ?? { legalName: "", dob: "" };
	const set = (patch: Partial<typeof identity>) =>
		stepper.setData("identity", { ...identity, ...patch });

	return (
		<div className="space-y-3">
			<p className="font-medium">Personal information</p>
			<Field
				label="Legal name"
				placeholder="Ada Lovelace"
				value={identity.legalName}
				error={errors.legalName}
				onChange={(event) => set({ legalName: event.target.value })}
			/>
			<Field
				label="Date of birth"
				placeholder="1990-12-10"
				value={identity.dob}
				error={errors.dob}
				onChange={(event) => set({ dob: event.target.value })}
			/>
		</div>
	);
}

function UploadAck({
	stepId,
	title,
	hint,
	label,
}: {
	stepId: "document" | "selfie";
	title: string;
	hint: string;
	label: string;
}) {
	const stepper = kyc.useStepperContext();
	const confirmed = stepper.data[stepId]?.confirmed ?? false;

	return (
		<div className="space-y-3">
			<p className="font-medium">{title}</p>
			<p className="text-muted-foreground">{hint}</p>
			<Label className="flex items-center gap-2 text-sm font-normal">
				<Checkbox
					checked={confirmed}
					onCheckedChange={(checked) =>
						stepper.setData(stepId, { confirmed: checked === true })
					}
				/>
				{label}
			</Label>
		</div>
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

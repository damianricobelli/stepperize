import { defineStepper } from "@stepperize/react";
import { Camera, FileCheck, IdCard, UserRound } from "lucide-react";
import type { ComponentType } from "react";
import { useState } from "react";
import { z } from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The identity step owns data, so it carries a schema. The document and selfie
// steps gate on a custom acknowledgement instead — both run in one guard.
const identitySchema = z.object({
	legalName: z.string().min(2, "Enter your legal name"),
	dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
});

const kyc = defineStepper(
	[
		{
			id: "identity",
			title: "Identity",
			icon: UserRound,
			schema: identitySchema,
		},
		{ id: "document", title: "Document", icon: IdCard },
		{ id: "selfie", title: "Selfie", icon: Camera },
		{ id: "review", title: "Review", icon: FileCheck },
	] as const,
	{ defaultData: { identity: { legalName: "", dob: "" } } },
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
	issues: ReadonlyArray<{ message: string; path?: ReadonlyArray<unknown> }>,
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
	const [errors, setErrors] = useState<Errors>({});
	const [submitted, setSubmitted] = useState(false);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-lg rounded-xl border bg-background p-6 shadow-sm"
			beforeStepChange={async ({ direction, from, validate, data }) => {
				if (direction !== "next") {
					setErrors({});
					return true;
				}
				// Schema-backed steps validate their data…
				const result = await validate();
				if (!result.success) {
					setErrors(toErrors(result.issues));
					return false;
				}
				// …and the upload steps require an explicit acknowledgement.
				if (from.id === "document" || from.id === "selfie") {
					const ack = (data[from.id] as { confirmed?: boolean } | undefined)
						?.confirmed;
					if (!ack) {
						setErrors({ _: "Confirm the upload before continuing." });
						return false;
					}
				}
				setErrors({});
				return true;
			}}
		>
			{({ stepper }) => (
				<>
					<Stepper.List className="flex items-center justify-between">
						<Stepper.Items>
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
												<Stepper.Trigger className="disabled:cursor-not-allowed">
													<Stepper.Indicator className="grid size-11 place-items-center rounded-xl border transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary data-[status=previous]:bg-primary/10 data-[status=previous]:text-primary data-[status=upcoming]:border-border data-[status=upcoming]:text-muted-foreground">
														<Icon className="size-5" />
													</Stepper.Indicator>
												</Stepper.Trigger>
												<Stepper.Title className="mt-2 text-xs font-medium" />
											</Stepper.Item>
											{index < stepper.count - 1 && (
												<div className="-mt-6 mx-2 h-0.5 flex-1 rounded bg-border" />
											)}
										</div>
									</div>
								);
							}}
						</Stepper.Items>
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

					{errors._ && (
						<Alert variant="destructive" className="mt-3">
							<AlertDescription>{errors._}</AlertDescription>
						</Alert>
					)}

					<Stepper.Actions className="mt-6 flex justify-between">
						<Stepper.Prev className={buttonVariants({ variant: "outline" })}>
							Back
						</Stepper.Prev>
						{submitted ? (
							<button
								type="button"
								onClick={() => {
									setSubmitted(false);
									setErrors({});
									stepper.data.reset();
									stepper.reset();
								}}
								className={buttonVariants()}
							>
								Start over
							</button>
						) : stepper.isLast ? (
							<button
								type="button"
								onClick={() => setSubmitted(true)}
								className={buttonVariants()}
							>
								Submit verification
							</button>
						) : (
							<Stepper.Next className={buttonVariants()}>Next</Stepper.Next>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}

function IdentityFields({ errors }: { errors: Errors }) {
	const stepper = kyc.useStepper();
	const identity = stepper.data.get("identity") ?? { legalName: "", dob: "" };
	const set = (patch: Partial<typeof identity>) =>
		stepper.data.set("identity", { ...identity, ...patch });

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
	const stepper = kyc.useStepper();
	const confirmed =
		(stepper.data.get(stepId) as { confirmed?: boolean } | undefined)
			?.confirmed ?? false;

	return (
		<div className="space-y-3">
			<p className="font-medium">{title}</p>
			<p className="text-muted-foreground">{hint}</p>
			<Label className="flex items-center gap-2 text-sm font-normal">
				<Checkbox
					checked={confirmed}
					onCheckedChange={(checked) =>
						stepper.data.set(stepId, { confirmed: checked === true })
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

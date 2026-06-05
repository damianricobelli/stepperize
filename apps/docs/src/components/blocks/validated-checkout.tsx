import { defineStepper } from "@stepperize/react";
import { Check, CreditCard, MapPin, Pencil } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Per-step schemas. `validate()` runs the stored data through these, and the
// `beforeStepChange` guard turns a failed result into blocked navigation.
const shippingSchema = z.object({
	name: z.string().min(1, "Name is required"),
	address: z.string().min(1, "Address is required"),
	zip: z.string().regex(/^\d{5}$/, "Enter a 5-digit ZIP"),
});

const paymentSchema = z.object({
	card: z.string().regex(/^\d{16}$/, "Enter a 16-digit card number"),
	cvc: z.string().regex(/^\d{3}$/, "3-digit CVC"),
});

const checkout = defineStepper(
	[
		{ id: "shipping", title: "Shipping", schema: shippingSchema },
		{ id: "payment", title: "Payment", schema: paymentSchema },
		{ id: "review", title: "Review" },
		{ id: "done", title: "Done" },
	] as const,
	// Seed empty drafts so validate() reports per-field issues from the start
	// (an undefined value would fail at the object root instead of each field).
	{
		defaultData: {
			shipping: { name: "", address: "", zip: "" },
			payment: { card: "", cvc: "" },
		},
	},
);

type Errors = Record<string, string>;

/** Read the first issue per field from a failed `validate()` result. */
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

/**
 * Validation + guard rejection: each step carries a Zod schema. Pressing
 * Continue runs `ctx.validate()` inside `beforeStepChange`; if it fails, the
 * guard returns `false`, the move is cancelled, and the issues are shown inline.
 * The review step reads every step's data back with `data.all()`.
 */
export function ValidatedCheckoutBlock() {
	const [errors, setErrors] = useState<Errors>({});

	return (
		<checkout.Stepper.Root
			linear
			className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm"
			beforeStepChange={async ({ direction, validate }) => {
				// Only gate forward moves (next()); Back/Edit should never be blocked.
				if (direction !== "next") {
					setErrors({});
					return true;
				}
				// Validate the step we're leaving against the transition data snapshot.
				const result = await validate();
				if (!result.success) {
					setErrors(toErrors(result.issues));
					return false; // cancel the transition
				}
				setErrors({});
				return true;
			}}
		>
			{({ stepper }) => {
				return (
					<>
						<Stepperline stepper={stepper} />

						<div className="mt-6 min-h-44">
							<ShippingStep stepper={stepper} errors={errors} />
							<PaymentStep stepper={stepper} errors={errors} />
							<ReviewStep stepper={stepper} />
							<DoneStep />
						</div>

						{!stepper.is("done") && (
							<checkout.Stepper.Actions className="mt-6 flex justify-between">
								<checkout.Stepper.Prev className={buttonVariants({ variant: "outline" })}>
									Back
								</checkout.Stepper.Prev>
								<checkout.Stepper.Next className={buttonVariants()}>
									{stepper.is("review") ? "Place order" : "Continue"}
								</checkout.Stepper.Next>
							</checkout.Stepper.Actions>
						)}
					</>
				);
			}}
		</checkout.Stepper.Root>
	);
}

type Stepper = ReturnType<typeof checkout.useStepper>;

function Stepperline({ stepper }: { stepper: Stepper }) {
	return (
		<checkout.Stepper.List className="flex items-center gap-2">
			<checkout.Stepper.Items>
				{(step, index) => (
					<checkout.Stepper.Item
						key={step.id}
						step={step.id}
						className="flex flex-1 items-center gap-2 last:flex-none"
					>
						<checkout.Stepper.Indicator className="group grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold transition-colors data-[status=active]:border-primary data-[status=active]:bg-primary data-[status=active]:text-primary-foreground data-[status=previous]:border-primary data-[status=previous]:bg-primary/10 data-[status=previous]:text-primary data-[status=upcoming]:border-border data-[status=upcoming]:text-muted-foreground">
							<Check className="hidden size-3.5 group-data-[status=previous]:block" />
							<span className="group-data-[status=previous]:hidden">
								{index + 1}
							</span>
						</checkout.Stepper.Indicator>
						{index < stepper.count - 1 && (
							<span className="h-px flex-1 bg-border" />
						)}
					</checkout.Stepper.Item>
				)}
			</checkout.Stepper.Items>
		</checkout.Stepper.List>
	);
}

function Field({
	label,
	value,
	onChange,
	error,
	placeholder,
}: {
	label: string;
	value: string;
	onChange: (v: string) => void;
	error?: string;
	placeholder?: string;
}) {
	return (
		<div className="space-y-1.5">
			<Label className="text-xs text-muted-foreground">{label}</Label>
			<Input
				value={value}
				placeholder={placeholder}
				onChange={(e) => onChange(e.target.value)}
				aria-invalid={error ? true : undefined}
			/>
			{error && (
				<p className="text-xs font-medium text-destructive">{error}</p>
			)}
		</div>
	);
}

function ShippingStep({
	stepper,
	errors,
}: {
	stepper: Stepper;
	errors: Errors;
}) {
	const value = stepper.data.get("shipping") ?? {
		name: "",
		address: "",
		zip: "",
	};
	const set = (patch: Partial<typeof value>) =>
		stepper.data.set("shipping", { ...value, ...patch });

	return (
		<checkout.Stepper.Content step="shipping" className="space-y-3">
			<div className="flex items-center gap-2 text-sm font-semibold">
				<MapPin className="size-4 text-primary" /> Where should we ship?
			</div>
			<Field
				label="Full name"
				value={value.name}
				onChange={(name) => set({ name })}
				error={errors.name}
				placeholder="Ada Lovelace"
			/>
			<Field
				label="Address"
				value={value.address}
				onChange={(address) => set({ address })}
				error={errors.address}
				placeholder="12 Analytical Ave"
			/>
			<Field
				label="ZIP code"
				value={value.zip}
				onChange={(zip) => set({ zip })}
				error={errors.zip}
				placeholder="90210"
			/>
		</checkout.Stepper.Content>
	);
}

function PaymentStep({
	stepper,
	errors,
}: {
	stepper: Stepper;
	errors: Errors;
}) {
	const value = stepper.data.get("payment") ?? { card: "", cvc: "" };
	const set = (patch: Partial<typeof value>) =>
		stepper.data.set("payment", { ...value, ...patch });

	return (
		<checkout.Stepper.Content step="payment" className="space-y-3">
			<div className="flex items-center gap-2 text-sm font-semibold">
				<CreditCard className="size-4 text-primary" /> Payment details
			</div>
			<Field
				label="Card number"
				value={value.card}
				onChange={(card) => set({ card })}
				error={errors.card}
				placeholder="4242424242424242"
			/>
			<Field
				label="CVC"
				value={value.cvc}
				onChange={(cvc) => set({ cvc })}
				error={errors.cvc}
				placeholder="123"
			/>
			<p className="text-xs text-muted-foreground">
				Try “1234” to see the guard block the step.
			</p>
		</checkout.Stepper.Content>
	);
}

function ReviewStep({ stepper }: { stepper: Stepper }) {
	const all = stepper.data.all();
	return (
		<checkout.Stepper.Content step="review" className="space-y-3">
			<p className="text-sm font-semibold">Review your order</p>
			<Summary title="Shipping" onEdit={() => stepper.goTo("shipping")}>
				<p>{all.shipping?.name}</p>
				<p className="text-muted-foreground">
					{all.shipping?.address}, {all.shipping?.zip}
				</p>
			</Summary>
			<Summary title="Payment" onEdit={() => stepper.goTo("payment")}>
				<p>•••• •••• •••• {all.payment?.card?.slice(-4)}</p>
			</Summary>
		</checkout.Stepper.Content>
	);
}

function Summary({
	title,
	onEdit,
	children,
}: {
	title: string;
	onEdit: () => void;
	children: React.ReactNode;
}) {
	return (
		<div className="rounded-lg border bg-muted/30 p-3 text-sm">
			<div className="mb-1 flex items-center justify-between">
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					{title}
				</span>
				<Button
					variant="link"
					size="xs"
					onClick={onEdit}
					className="h-auto p-0"
				>
					<Pencil /> Edit
				</Button>
			</div>
			{children}
		</div>
	);
}

function DoneStep() {
	return (
		<checkout.Stepper.Content
			step="done"
			className="grid place-items-center gap-2 py-6 text-center"
		>
			<span className="grid size-12 place-items-center rounded-full bg-chart-2/15 text-chart-2">
				<Check className="size-6" />
			</span>
			<p className="text-sm font-medium">Order placed</p>
			<p className="text-xs text-muted-foreground">
				Every step passed validation before we got here.
			</p>
		</checkout.Stepper.Content>
	);
}

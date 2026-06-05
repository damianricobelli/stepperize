import { defineStepper } from "@stepperize/react";
import { ArrowRight, Check, User, Users } from "lucide-react";

const onboarding = defineStepper([
	{ id: "account", title: "Account type" },
	{ id: "profile", title: "Your profile" },
	{ id: "team", title: "Invite team" },
	{ id: "done", title: "All set" },
] as const);

const { Stepper, useStepper } = onboarding;

type AccountType = "personal" | "team";

// The path through the flow is computed from an earlier answer: a "team"
// account visits the invite step, a "personal" account skips it entirely.
function pathFor(
	type: AccountType,
): ("account" | "profile" | "team" | "done")[] {
	return type === "team"
		? ["account", "profile", "team", "done"]
		: ["account", "profile", "done"];
}

/**
 * Branching + dynamic flow paths: the account type chosen on the first step
 * decides which steps come next. `goTo` jumps across the skipped step, and the
 * progress dots are rendered from the same computed path.
 */
export function ConditionalOnboardingBlock() {
	return (
		<Stepper.Root className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
			{() => <Inner />}
		</Stepper.Root>
	);
}

function Inner() {
	const stepper = useStepper();
	const type =
		(stepper.data.get("account") as AccountType | undefined) ?? "team";
	const path = pathFor(type);
	const pos = path.indexOf(stepper.current.id as (typeof path)[number]);

	const goNext = () => {
		const next = path[pos + 1];
		if (next) stepper.goTo(next);
	};
	const goBack = () => {
		const prev = path[pos - 1];
		if (prev) stepper.goTo(prev);
	};

	return (
		<>
			{/* progress dots come from the *computed* path, so they shrink/grow with the branch */}
			<div className="flex items-center gap-1.5">
				{path.map((id, i) => (
					<span
						key={id}
						className={`h-1.5 flex-1 rounded-full transition-colors ${i <= pos ? "bg-primary" : "bg-muted"}`}
					/>
				))}
			</div>
			<p className="mt-3 text-xs text-muted-foreground">
				Step {pos + 1} of {path.length}
				{type === "personal" && " · team step skipped"}
			</p>

			<div className="mt-4 min-h-40">
				<Stepper.Content step="account" className="space-y-2">
					<p className="text-sm font-semibold">How will you use the app?</p>
					<Choice
						active={type === "personal"}
						icon={User}
						title="Just me"
						hint="A personal workspace"
						onClick={() => stepper.data.set("account", "personal")}
					/>
					<Choice
						active={type === "team"}
						icon={Users}
						title="With my team"
						hint="Invite people to collaborate"
						onClick={() => stepper.data.set("account", "team")}
					/>
				</Stepper.Content>

				<Stepper.Content step="profile" className="space-y-3">
					<p className="text-sm font-semibold">Tell us about you</p>
					<input
						placeholder="Display name"
						className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary"
					/>
					<input
						placeholder="Role"
						className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary"
					/>
				</Stepper.Content>

				<Stepper.Content step="team" className="space-y-3">
					<p className="text-sm font-semibold">Invite your team</p>
					<input
						placeholder="teammate@company.com"
						className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none focus:border-primary"
					/>
					<p className="text-xs text-muted-foreground">
						Only shown because you picked a team account.
					</p>
				</Stepper.Content>

				<Stepper.Content
					step="done"
					className="grid place-items-center gap-2 py-6 text-center"
				>
					<span className="grid size-12 place-items-center rounded-full bg-chart-2/15 text-chart-2">
						<Check className="size-6" />
					</span>
					<p className="text-sm font-medium">You're all set</p>
					<p className="text-xs text-muted-foreground">
						{type === "team"
							? "Your team workspace is ready."
							: "Your personal workspace is ready."}
					</p>
				</Stepper.Content>
			</div>

			{!stepper.is("done") && (
				<div className="mt-4 flex justify-between">
					<button
						type="button"
						onClick={goBack}
						disabled={pos === 0}
						className="inline-flex h-9 items-center rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50"
					>
						Back
					</button>
					<button
						type="button"
						onClick={goNext}
						className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
					>
						{path[pos + 1] === "done" ? "Finish" : "Continue"}
						<ArrowRight className="size-4" />
					</button>
				</div>
			)}
		</>
	);
}

function Choice({
	active,
	icon: Icon,
	title,
	hint,
	onClick,
}: {
	active: boolean;
	icon: typeof User;
	title: string;
	hint: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
				active ? "border-primary bg-primary/5" : "hover:bg-muted"
			}`}
		>
			<span
				className={`grid size-9 place-items-center rounded-lg ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
			>
				<Icon className="size-4" />
			</span>
			<span className="flex-1">
				<span className="block text-sm font-medium">{title}</span>
				<span className="block text-xs text-muted-foreground">{hint}</span>
			</span>
			{active && <Check className="size-4 text-primary" />}
		</button>
	);
}

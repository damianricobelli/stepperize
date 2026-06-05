import { defineStepper } from "@stepperize/react";
import { ArrowLeft, Briefcase, RotateCcw, Sparkles, User } from "lucide-react";

const tree = defineStepper([
	{ id: "use", title: "Use case" },
	{ id: "personal", title: "Budget" },
	{ id: "business", title: "Team size" },
	{ id: "result", title: "Recommendation" },
] as const);

const { Stepper, useStepper } = tree;

type Use = "personal" | "business";
type Answer = "free" | "paid" | "small" | "large";

// Two branches off the root, each asking a different follow-up, both converging
// on a single "result" step that derives its outcome from the path taken.
const PLANS: Record<string, { name: string; blurb: string }> = {
	"personal/free": {
		name: "Hobby",
		blurb: "Free forever for personal projects.",
	},
	"personal/paid": {
		name: "Pro",
		blurb: "For individuals who need more power.",
	},
	"business/small": { name: "Team", blurb: "Collaboration for small teams." },
	"business/large": {
		name: "Enterprise",
		blurb: "SSO, audit logs, and support.",
	},
};

/**
 * Decision tree: the first answer branches to one of two follow-up questions,
 * then both branches converge on a shared result computed from the answers.
 */
export function DecisionTreeBlock() {
	return (
		<Stepper.Root className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm">
			{() => <Inner />}
		</Stepper.Root>
	);
}

function Inner() {
	const stepper = useStepper();
	const use = stepper.data.get("use") as Use | undefined;
	const answer = stepper.data.get("result") as Answer | undefined;

	// Flow data is keyed by step id: the use case lives on "use", the follow-up
	// answer on "result" (the step that reads them both back).
	const pick = (
		key: "use" | "result",
		value: string,
		next: Parameters<typeof stepper.goTo>[0],
	) => {
		stepper.data.set(key, value);
		stepper.goTo(next);
	};

	return (
		<>
			<div className="mb-4 flex items-center gap-2 text-sm font-semibold">
				<Sparkles className="size-4 text-primary" /> Find your plan
			</div>

			<div className="min-h-44">
				<Stepper.Content step="use" className="space-y-2">
					<p className="text-sm text-muted-foreground">
						What are you building?
					</p>
					<Option
						icon={User}
						label="A personal project"
						onClick={() => pick("use", "personal", "personal")}
					/>
					<Option
						icon={Briefcase}
						label="Something for work"
						onClick={() => pick("use", "business", "business")}
					/>
				</Stepper.Content>

				<Stepper.Content step="personal" className="space-y-2">
					<BackButton onClick={() => stepper.goTo("use")} />
					<p className="text-sm text-muted-foreground">What's your budget?</p>
					<Option
						label="Free only"
						onClick={() => pick("result", "free", "result")}
					/>
					<Option
						label="Happy to pay for more"
						onClick={() => pick("result", "paid", "result")}
					/>
				</Stepper.Content>

				<Stepper.Content step="business" className="space-y-2">
					<BackButton onClick={() => stepper.goTo("use")} />
					<p className="text-sm text-muted-foreground">How big is your team?</p>
					<Option
						label="Under 10 people"
						onClick={() => pick("result", "small", "result")}
					/>
					<Option
						label="10 or more"
						onClick={() => pick("result", "large", "result")}
					/>
				</Stepper.Content>

				<Stepper.Content step="result">
					<Result use={use} answer={answer} onRestart={() => stepper.reset()} />
				</Stepper.Content>
			</div>
		</>
	);
}

function Result({
	use,
	answer,
	onRestart,
}: {
	use?: Use;
	answer?: Answer;
	onRestart: () => void;
}) {
	const plan = use && answer ? PLANS[`${use}/${answer}`] : undefined;
	if (!plan) return null;
	return (
		<div className="space-y-3 text-center">
			<p className="text-xs uppercase tracking-wide text-muted-foreground">
				We recommend
			</p>
			<p className="text-2xl font-bold text-primary">{plan.name}</p>
			<p className="text-sm text-muted-foreground">{plan.blurb}</p>
			<button
				type="button"
				onClick={onRestart}
				className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-background px-4 text-sm font-medium transition-colors hover:bg-muted"
			>
				<RotateCcw className="size-3.5" /> Start over
			</button>
		</div>
	);
}

function Option({
	icon: Icon,
	label,
	onClick,
}: {
	icon?: typeof User;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm font-medium transition-colors hover:border-primary/50 hover:bg-primary/5"
		>
			{Icon && (
				<span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
					<Icon className="size-4" />
				</span>
			)}
			{label}
		</button>
	);
}

function BackButton({ onClick }: { onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
		>
			<ArrowLeft className="size-3.5" /> Back
		</button>
	);
}

"use client";

import { Link } from "@tanstack/react-router";
import {
	ArrowRight,
	GitBranch,
	type LucideIcon,
	RefreshCw,
	ShieldCheck,
} from "lucide-react";
import {
	Activity,
	type KeyboardEvent,
	type ReactNode,
	useRef,
	useState,
} from "react";
import { cn } from "@/lib/utils";
import { AsyncProvisioningBlock } from "../blocks/async-provisioning";
import { ConditionalOnboardingBlock } from "../blocks/conditional-onboarding";
import { ValidatedCheckoutBlock } from "../blocks/validated-checkout";
import { Section, SectionHeading } from "./shared";

type Demo = {
	id: string;
	icon: LucideIcon;
	label: string;
	body: string;
	api: string;
	Block: () => ReactNode;
};

const DEMOS: Demo[] = [
	{
		id: "guards",
		icon: ShieldCheck,
		label: "Validation that blocks",
		body: "A failed schema check makes the guard return false. The move is cancelled, not just frowned upon.",
		api: "beforeStepChange",
		Block: ValidatedCheckoutBlock,
	},
	{
		id: "branching",
		icon: GitBranch,
		label: "Branching paths",
		body: "An earlier answer rewrites the path. A personal account skips the team step entirely.",
		api: "goTo · canGoTo",
		Block: ConditionalOnboardingBlock,
	},
	{
		id: "async",
		icon: RefreshCw,
		label: "Async work and retry",
		body: "The transition awaits real work, exposes isPending, fails the first try, and recovers on retry.",
		api: "isPending",
		Block: AsyncProvisioningBlock,
	},
];

/**
 * Flow logic, shown live: a tab per capability on the left, the real block on
 * a stage on the right. Panels stay mounted inside <Activity>, so a half-filled
 * demo keeps its state when you peek at another tab and come back.
 */
export function FlowLogic() {
	const [active, setActive] = useState(DEMOS[0].id);
	const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

	const onKeyDown = (event: KeyboardEvent, index: number) => {
		const keys: Record<string, number> = {
			ArrowDown: 1,
			ArrowRight: 1,
			ArrowUp: -1,
			ArrowLeft: -1,
		};
		const delta = keys[event.key];
		if (delta === undefined) return;
		event.preventDefault();
		const next = (index + delta + DEMOS.length) % DEMOS.length;
		setActive(DEMOS[next].id);
		tabRefs.current[next]?.focus();
	};

	return (
		<Section>
			<SectionHeading
				eyebrow="More than a stepper"
				title="Real flow logic, not just step tracking."
			>
				Most stepper libraries stop at "which step is active". Stepperize
				handles the hard parts too: guards that block, computed branching, and
				async transitions with retry. These demos are live.
			</SectionHeading>

			<div className="mt-12 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:gap-6">
				<div
					role="tablist"
					aria-label="Flow logic demos"
					className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto overscroll-x-contain px-4 pb-1 [scrollbar-width:none] lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
				>
					{DEMOS.map((demo, index) => {
						const selected = demo.id === active;
						return (
							<button
								key={demo.id}
								ref={(node) => {
									tabRefs.current[index] = node;
								}}
								type="button"
								role="tab"
								id={`flow-tab-${demo.id}`}
								aria-selected={selected}
								aria-controls={`flow-panel-${demo.id}`}
								tabIndex={selected ? 0 : -1}
								onClick={() => setActive(demo.id)}
								onKeyDown={(event) => onKeyDown(event, index)}
								className={cn(
									"pressable group relative flex w-[78%] shrink-0 snap-start flex-col items-start rounded-2xl border p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[46%] lg:w-full lg:p-5",
									selected
										? "border-primary/40 bg-card shadow-md shadow-primary/5"
										: "bg-transparent hover:border-foreground/15 hover:bg-card/60",
								)}
							>
								<span className="flex w-full items-center gap-3">
									<span
										className={cn(
											"flex size-8 items-center justify-center rounded-lg border transition-colors duration-200",
											selected
												? "border-primary/30 bg-primary/10 text-primary"
												: "bg-muted text-muted-foreground",
										)}
									>
										<demo.icon className="size-4" aria-hidden />
									</span>
									<span className="flex-1 text-[15px] font-semibold tracking-tight">
										{demo.label}
									</span>
								</span>
								<span className="mt-3 text-sm leading-relaxed text-muted-foreground">
									{demo.body}
								</span>
								<code
									className={cn(
										"mt-3 rounded-md border px-1.5 py-0.5 font-mono text-[11.5px] transition-colors duration-200",
										selected
											? "border-primary/20 bg-primary/5 text-primary"
											: "bg-muted/60 text-muted-foreground",
									)}
								>
									{demo.api}
								</code>
							</button>
						);
					})}
				</div>

				<div className="relative grid min-h-[30rem] overflow-hidden rounded-3xl border bg-muted/30">
					<div
						aria-hidden
						className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_70%_70%_at_50%_50%,black,transparent)]"
					/>
					{DEMOS.map((demo) => (
						<Activity
							key={demo.id}
							mode={demo.id === active ? "visible" : "hidden"}
						>
							<div
								role="tabpanel"
								id={`flow-panel-${demo.id}`}
								aria-labelledby={`flow-tab-${demo.id}`}
								className="relative col-start-1 row-start-1 flex items-center justify-center p-4 duration-300 ease-out-strong animate-in fade-in-0 motion-safe:zoom-in-98 sm:p-10"
							>
								<demo.Block />
							</div>
						</Activity>
					))}
				</div>
			</div>

			<Link
				to="/blocks"
				search={{ category: "flow-control" }}
				className="mt-8 inline-flex items-center gap-1.5 rounded text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
			>
				See every flow-logic block
				<ArrowRight className="size-4" aria-hidden />
			</Link>
		</Section>
	);
}

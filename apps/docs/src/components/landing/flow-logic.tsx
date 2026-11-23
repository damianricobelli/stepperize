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
	type ComponentType,
	type KeyboardEvent,
	lazy,
	Suspense,
	useRef,
	useState,
} from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { cn } from "@/lib/utils";
import {
	DemoPlaceholder,
	Section,
	SectionHeading,
	useNearViewport,
} from "./shared";

type Demo = {
	id: string;
	icon: LucideIcon;
	label: string;
	body: string;
	api: string;
	/** Loaded when the section nears the screen: below the fold, not in the first bundle. */
	Block: ComponentType;
};

const DEMOS: Demo[] = [
	{
		id: "guards",
		icon: ShieldCheck,
		label: "Validation that blocks",
		body: "next() checks the step against its schema. A failed check cancels the move and hands back the issues to show.",
		api: "next · issues",
		Block: lazy(() =>
			import("../blocks/validated-checkout").then((m) => ({
				default: m.ValidatedCheckoutBlock,
			})),
		),
	},
	{
		id: "branching",
		icon: GitBranch,
		label: "Branching paths",
		body: "An earlier answer rewrites the path. A personal account skips the team step entirely, and Back returns the way you came.",
		api: "next map · prev",
		Block: lazy(() =>
			import("../blocks/conditional-onboarding").then((m) => ({
				default: m.ConditionalOnboardingBlock,
			})),
		),
	},
	{
		id: "async",
		icon: RefreshCw,
		label: "Async work and retry",
		body: "The transition awaits real work, exposes isPending, fails the first try, and recovers on retry.",
		api: "isPending",
		Block: lazy(() =>
			import("../blocks/async-provisioning").then((m) => ({
				default: m.AsyncProvisioningBlock,
			})),
		),
	},
];

/**
 * Flow logic, shown live: a tab per capability on the left, the real block on
 * a stage on the right. Panels stay mounted inside <Activity>, so a half-filled
 * demo keeps its state when you peek at another tab and come back.
 */
export function FlowLogic() {
	const [active, setActive] = useState(DEMOS[0].id);
	// Panels settle in when the visitor clicks or taps a tab: not on first
	// paint, and not from the arrow keys (keyboard moves get no animation).
	const [switched, setSwitched] = useState(false);
	const select = (id: string, animate: boolean) => {
		setActive(id);
		setSwitched(animate);
	};
	const [stageRef, near] = useNearViewport<HTMLDivElement>();
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
		select(DEMOS[next].id, false);
		tabRefs.current[next]?.focus();
	};

	return (
		<Section>
			<SectionHeading
				eyebrow="More than a stepper"
				title="Real flow logic, not just step tracking."
			>
				Most stepper libraries stop at "which step is active". Stepperize
				handles the hard parts too: validation that blocks, declarative
				branching, and async transitions with retry. They are options of the
				core, so they read the same in every framework.
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
								onClick={(event) => {
									// `detail` is 0 for Enter or Space: a keyboard press.
									select(demo.id, event.detail > 0);
									// On phones the tabs are a swipeable strip; bring a
									// half-visible tab fully into view once chosen.
									event.currentTarget.scrollIntoView({
										block: "nearest",
										inline: "nearest",
										behavior: window.matchMedia(
											"(prefers-reduced-motion: reduce)",
										).matches
											? "auto"
											: "smooth",
									});
								}}
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

				<div
					ref={stageRef}
					className="relative grid min-h-[28rem] overflow-hidden rounded-3xl border bg-muted/30 sm:min-h-[30rem]"
				>
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
								className={cn(
									"relative col-start-1 row-start-1 flex items-center justify-center p-4 sm:p-10",
									switched && "lp-swap",
								)}
							>
								<Suspense fallback={<DemoPlaceholder />}>
									{near ? <demo.Block /> : <DemoPlaceholder />}
								</Suspense>
							</div>
						</Activity>
					))}
				</div>
			</div>

			<div className="mt-6 flex flex-col gap-x-6 gap-y-3 sm:flex-row sm:items-center sm:justify-between">
				{/*
				 * The demos are the React blocks (shadcn/ui). Say so, and keep it
				 * apart from the claim above: the logic is the core's.
				 */}
				<p className="inline-flex items-start gap-2 text-[13px] text-muted-foreground sm:items-center">
					<FrameworkIcon id="react" className="mt-0.5 size-3.5 sm:mt-0" />
					Live demos built with the React blocks. The options behind them work
					in every binding.
				</p>
				<Link
					to="/blocks"
					search={{ category: "flow-control" }}
					className="hit-44 inline-flex shrink-0 items-center gap-1.5 self-start rounded text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring sm:self-auto"
				>
					See every flow-logic block
					<ArrowRight className="size-4" aria-hidden />
				</Link>
			</div>
		</Section>
	);
}

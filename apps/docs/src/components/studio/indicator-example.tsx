import { Check } from "lucide-react";
import type { Indicator } from "@/lib/studio/config";
import { cn } from "@/lib/utils";

/**
 * The three marker states side by side, so a choice that only shows on some
 * steps (the check appears once a step is complete) is visible right away.
 */

const STATES = [
	{ status: "previous", label: "Done", index: 0 },
	{ status: "active", label: "Current", index: 1 },
	{ status: "upcoming", label: "Next", index: 2 },
] as const;

type Status = (typeof STATES)[number]["status"];

const MARKER = {
	previous: "border-primary/40 bg-primary/10 text-primary",
	active: "border-primary bg-primary text-primary-foreground",
	upcoming: "bg-background text-muted-foreground",
} satisfies Record<Status, string>;

function MarkerBody({
	indicator,
	status,
	index,
}: {
	indicator: Indicator;
	status: Status;
	index: number;
}) {
	if (indicator === "dot")
		return <span className="size-1.5 rounded-full bg-current" />;
	if (indicator === "check" && status === "previous")
		return <Check aria-hidden className="size-3.5" strokeWidth={2.5} />;
	return <>{index + 1}</>;
}

export function IndicatorExample({ indicator }: { indicator: Indicator }) {
	return (
		<div
			aria-hidden
			className="flex items-start justify-between gap-2 rounded-lg border bg-card px-4 py-3"
		>
			{STATES.map((state, i) => (
				<div key={state.status} className="contents">
					<div className="grid justify-items-center gap-1.5">
						<span
							className={cn(
								"grid size-7 place-items-center rounded-full border text-xs font-medium tabular-nums transition-colors duration-150",
								MARKER[state.status],
							)}
						>
							<MarkerBody
								indicator={indicator}
								status={state.status}
								index={state.index}
							/>
						</span>
						<span className="text-[11px] text-muted-foreground">
							{state.label}
						</span>
					</div>
					{i < STATES.length - 1 ? (
						<span
							className={cn(
								"mt-3.5 h-px flex-1",
								i === 0 ? "bg-primary/50" : "bg-border",
							)}
						/>
					) : null}
				</div>
			))}
		</div>
	);
}

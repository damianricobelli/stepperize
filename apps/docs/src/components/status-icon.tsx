import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "yes" | "no" | "neutral";

const PATH: Record<Tone, string> = {
	yes: "M4 8.5l2.5 2.5L12 5.5",
	no: "M5 5l6 6M11 5l-6 6",
	neutral: "M4.5 8h7",
};

const TONE: Record<Tone, string> = {
	yes: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
	no: "bg-red-500/10 text-red-600 dark:text-red-400",
	neutral: "bg-muted text-muted-foreground",
};

/**
 * A drawn status mark. Text glyphs and emoji (✓ ✅ ❌) change size, color and
 * baseline with every font and platform; an SVG sits dead-center every time.
 */
export function StatusIcon({
	tone,
	className,
}: {
	tone: Tone;
	className?: string;
}) {
	return (
		<span
			aria-hidden
			className={cn(
				"inline-grid size-5 shrink-0 place-items-center rounded-full leading-none",
				TONE[tone],
				className,
			)}
		>
			<svg viewBox="0 0 16 16" className="block size-3" aria-hidden>
				<path
					d={PATH[tone]}
					fill="none"
					stroke="currentColor"
					strokeWidth="2.5"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		</span>
	);
}

/** MDX: a list of what something does and does not do. */
export function CheckList({ children }: { children: ReactNode }) {
	return <ul className="not-prose my-5 space-y-2.5">{children}</ul>;
}

function Item({ tone, children }: { tone: Tone; children: ReactNode }) {
	return (
		<li className="flex items-start gap-3 text-[15px] leading-relaxed">
			<StatusIcon tone={tone} className="mt-0.5" />
			<span className="text-fd-foreground/90 [&_code]:rounded [&_code]:border [&_code]:bg-fd-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] [&_strong]:font-semibold [&_strong]:text-fd-foreground">
				{children}
			</span>
		</li>
	);
}

export function CheckItem({ children }: { children: ReactNode }) {
	return <Item tone="yes">{children}</Item>;
}

export function CrossItem({ children }: { children: ReactNode }) {
	return <Item tone="no">{children}</Item>;
}

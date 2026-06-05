import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────── layout primitives ──────────────────────── */

export function Section({
	children,
	className,
}: {
	children: ReactNode;
	className?: string;
}) {
	return (
		<section className={className}>
			<div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
				{children}
			</div>
		</section>
	);
}

export function Eyebrow({
	children,
	center,
}: {
	children: ReactNode;
	center?: boolean;
}) {
	return (
		<p
			className={cn(
				"text-sm font-semibold uppercase tracking-wider text-primary",
				center && "text-center",
			)}
		>
			{children}
		</p>
	);
}

export function Code({ children }: { children: ReactNode }) {
	return (
		<code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
			{children}
		</code>
	);
}

/* ───────────────────── tokenized-code building blocks ────────────────── */

/** Keyword (import, const, return…). */
export const K = ({ children }: { children: ReactNode }) => (
	<span className="text-violet-600 dark:text-violet-400">{children}</span>
);
/** Function / identifier in call position. */
export const F = ({ children }: { children: ReactNode }) => (
	<span className="text-blue-600 dark:text-blue-400">{children}</span>
);
/** String literal. */
export const S = ({ children }: { children: ReactNode }) => (
	<span className="text-emerald-600 dark:text-emerald-400">{children}</span>
);
/** Type / component name. */
export const T = ({ children }: { children: ReactNode }) => (
	<span className="text-amber-600 dark:text-amber-400">{children}</span>
);
/** Comment. */
export const C = ({ children }: { children: ReactNode }) => (
	<span className="text-muted-foreground">{children}</span>
);
/** Punctuation / dim syntax. */
export const P = ({ children }: { children: ReactNode }) => (
	<span className="text-foreground/55">{children}</span>
);

/**
 * A macOS-style editor window chrome with traffic lights and a filename tab.
 * Wraps any tokenized `<pre>` so every code surface on the landing page reads
 * as the same product.
 */
export function CodeFrame({
	filename,
	children,
	tone = "default",
	className,
}: {
	filename: string;
	children: ReactNode;
	/** `bad` tints the tab red to signal a failing/rejected example. */
	tone?: "default" | "bad" | "good";
	className?: string;
}) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-2xl border bg-card shadow-xl",
				tone === "bad" && "border-red-500/30",
				tone === "good" && "border-emerald-500/30",
				className,
			)}
		>
			<div className="flex items-center gap-2 border-b bg-muted/40 px-4 py-2.5">
				<span className="h-3 w-3 rounded-full bg-red-400/70" />
				<span className="h-3 w-3 rounded-full bg-amber-400/70" />
				<span className="h-3 w-3 rounded-full bg-emerald-400/70" />
				<span className="ml-2 font-mono text-xs text-muted-foreground">
					{filename}
				</span>
			</div>
			{children}
		</div>
	);
}

/* ───────────────────────────────── icons ────────────────────────────── */

export function GitHubMark({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 16 16"
			fill="currentColor"
			className={className}
			aria-hidden="true"
			focusable="false"
			role="img"
		>
			<title>GitHub</title>
			<path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0016 8c0-4.42-3.58-8-8-8z" />
		</svg>
	);
}

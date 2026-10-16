import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ─────────────────────────── layout primitives ──────────────────────── */

export function Section({
	children,
	className,
	id,
}: {
	children: ReactNode;
	className?: string;
	id?: string;
}) {
	return (
		<section id={id} className={cn("scroll-mt-20", className)}>
			<div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
				{children}
			</div>
		</section>
	);
}

export function Eyebrow({ children }: { children: ReactNode }) {
	return (
		<p className="inline-flex items-center gap-2 text-sm font-medium text-primary">
			{children}
		</p>
	);
}

/**
 * Eyebrow + title + lede, the opening of every landing section. One component
 * so rhythm and type scale stay identical from section to section.
 */
export function SectionHeading({
	eyebrow,
	title,
	children,
	align = "start",
	className,
}: {
	eyebrow: ReactNode;
	title: ReactNode;
	children?: ReactNode;
	align?: "start" | "center";
	className?: string;
}) {
	return (
		<div
			className={cn(
				"max-w-2xl",
				align === "center" && "mx-auto text-center",
				className,
			)}
		>
			<Eyebrow>{eyebrow}</Eyebrow>
			<h2 className="mt-3 text-[1.875rem] font-semibold leading-[1.1] tracking-[-0.03em] sm:text-[2.5rem]">
				{title}
			</h2>
			{children && (
				<p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-[17px]">
					{children}
				</p>
			)}
		</div>
	);
}

export function Code({ children }: { children: ReactNode }) {
	return (
		<code className="rounded-md border bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
			{children}
		</code>
	);
}

/* ───────────────────── tokenized-code building blocks ────────────────── */

/** Keyword (import, const, return…). */
export const K = ({ children }: { children: ReactNode }) => (
	<span className="text-violet-600 dark:text-violet-300">{children}</span>
);
/** Function / identifier in call position. */
export const F = ({ children }: { children: ReactNode }) => (
	<span className="text-sky-700 dark:text-sky-300">{children}</span>
);
/** String literal. */
export const S = ({ children }: { children: ReactNode }) => (
	<span className="text-emerald-700 dark:text-emerald-300">{children}</span>
);
/** Type / component name. */
export const T = ({ children }: { children: ReactNode }) => (
	<span className="text-amber-700 dark:text-amber-300">{children}</span>
);
/** Comment. */
export const C = ({ children }: { children: ReactNode }) => (
	<span className="text-muted-foreground">{children}</span>
);
/** Punctuation / dim syntax. */
export const P = ({ children }: { children: ReactNode }) => (
	<span className="text-foreground/45">{children}</span>
);

/**
 * Editor window chrome with a filename tab. Wraps any tokenized `<pre>` so
 * every code surface on the landing page reads as the same product as the
 * hero playground.
 */
export function CodeFrame({
	filename,
	children,
	aside,
	className,
}: {
	filename: string;
	children: ReactNode;
	/** Right-aligned slot in the title bar (a badge, a toggle). */
	aside?: ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"overflow-hidden rounded-2xl border bg-card shadow-xl",
				className,
			)}
		>
			<div className="flex h-11 items-center gap-3 border-b bg-muted/40 px-4">
				<div className="flex gap-1.5" aria-hidden>
					<span className="size-2.5 rounded-full bg-foreground/15" />
					<span className="size-2.5 rounded-full bg-foreground/15" />
					<span className="size-2.5 rounded-full bg-foreground/15" />
				</div>
				<span className="font-mono text-xs text-muted-foreground">
					{filename}
				</span>
				{aside && <div className="ml-auto">{aside}</div>}
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

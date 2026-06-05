"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Accessible copy-to-clipboard button with a transient "copied" state. Used for
 * code, install commands, and registry URLs across the Blocks gallery.
 */
export function CopyButton({
	value,
	label,
	className,
	children,
}: {
	value: string;
	/** Accessible label, e.g. "Copy install command". */
	label: string;
	className?: string;
	children?: React.ReactNode;
}) {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const copy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(() => setCopied(false), 1600);
		} catch {
			/* clipboard unavailable */
		}
	}, [value]);

	return (
		<button
			type="button"
			onClick={copy}
			aria-label={label}
			data-copied={copied || undefined}
			className={cn(
				"inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground",
				className,
			)}
		>
			{copied ? (
				<Check className="size-3.5 text-emerald-500" aria-hidden />
			) : (
				<Copy className="size-3.5" aria-hidden />
			)}
			{children}
			<span className="sr-only" role="status">
				{copied ? "Copied" : ""}
			</span>
		</button>
	);
}

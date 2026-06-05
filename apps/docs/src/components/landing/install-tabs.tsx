"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const MANAGERS = {
	npm: "npm i @stepperize/react",
	pnpm: "pnpm add @stepperize/react",
	yarn: "yarn add @stepperize/react",
	bun: "bun add @stepperize/react",
} as const;

type Manager = keyof typeof MANAGERS;

/**
 * Copy-ready install command with a tab per package manager. Meeting the
 * developer at whichever tool they already use removes a tiny but real
 * friction point on the path to a first install.
 */
export function InstallTabs() {
	const [manager, setManager] = useState<Manager>("npm");
	const [copied, setCopied] = useState(false);
	const cmd = MANAGERS[manager];

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(cmd);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			/* clipboard unavailable */
		}
	};

	return (
		<div className="inline-flex w-full max-w-sm flex-col overflow-hidden rounded-xl border bg-card/60 backdrop-blur">
			<div className="flex items-center gap-1 border-b bg-muted/30 px-1.5 pt-1.5">
				{(Object.keys(MANAGERS) as Manager[]).map((m) => (
					<button
						key={m}
						type="button"
						onClick={() => setManager(m)}
						className={cn(
							"rounded-t-md px-2.5 py-1 font-mono text-xs transition-colors",
							m === manager
								? "bg-card text-foreground"
								: "text-muted-foreground hover:text-foreground",
						)}
					>
						{m}
					</button>
				))}
			</div>
			<button
				type="button"
				onClick={copy}
				aria-label="Copy install command"
				className="flex items-center justify-between gap-3 px-3 py-2.5 text-left font-mono text-xs transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
			>
				<span className="truncate">
					<span className="select-none text-primary">$ </span>
					{cmd}
				</span>
				{copied ? (
					<Check className="size-3.5 shrink-0 text-emerald-500" aria-hidden />
				) : (
					<Copy
						className="size-3.5 shrink-0 text-muted-foreground"
						aria-hidden
					/>
				)}
			</button>
		</div>
	);
}

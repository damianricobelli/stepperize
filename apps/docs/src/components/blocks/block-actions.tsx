"use client";

import { Check, Copy, Terminal } from "lucide-react";
import { useState } from "react";
import {
	v0Url as buildV0Url,
	installCommand,
	PACKAGE_MANAGERS as MANAGERS,
	type PackageManager,
} from "@/lib/blocks";
import { cn } from "@/lib/utils";

/**
 * Install + v0 actions for a registry-backed Block. Renders a package-manager
 * tabbed `shadcn add` command (copyable) and an "Open in v0" button — the same
 * affordances shadcn/ui, Magic UI, and Origin UI provide. Registry URL helpers
 * are shared with the Blocks gallery via `@/lib/blocks`.
 */
export function BlockActions({ name }: { name: string }) {
	const [pm, setPm] = useState<PackageManager>("npm");
	const [copied, setCopied] = useState(false);

	const command = installCommand(name, pm);
	const v0Url = buildV0Url(name);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(command);
			setCopied(true);
			setTimeout(() => setCopied(false), 1600);
		} catch {
			/* clipboard unavailable */
		}
	};

	return (
		<div className="not-prose my-4 overflow-hidden rounded-xl border bg-card">
			<div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-3 py-1.5">
				<div className="flex items-center gap-1">
					<Terminal
						className="mr-1 size-3.5 text-muted-foreground"
						aria-hidden
					/>
					{MANAGERS.map((m) => (
						<button
							key={m.id}
							type="button"
							onClick={() => setPm(m.id)}
							className={cn(
								"rounded-md px-2 py-1 text-xs font-medium transition-colors",
								pm === m.id
									? "bg-background text-foreground shadow-sm"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{m.label}
						</button>
					))}
				</div>
				<a
					href={v0Url}
					target="_blank"
					rel="noreferrer noopener"
					className="inline-flex h-7 items-center gap-1.5 rounded-md bg-foreground px-2.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
				>
					Open in
					<V0Logo className="h-3.5 w-auto" />
				</a>
			</div>

			<div className="flex items-center justify-between gap-3 px-3 py-2.5">
				<code className="overflow-x-auto whitespace-nowrap font-mono text-xs text-foreground">
					<span className="select-none text-muted-foreground">$ </span>
					{command}
				</code>
				<button
					type="button"
					onClick={copy}
					aria-label="Copy install command"
					className="grid size-7 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground transition-colors hover:text-foreground"
				>
					{copied ? (
						<Check className="size-3.5 text-emerald-500" />
					) : (
						<Copy className="size-3.5" />
					)}
				</button>
			</div>
		</div>
	);
}

function V0Logo({ className }: { className?: string }) {
	return (
		<svg
			fill="currentColor"
			viewBox="0 0 147 70"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<path d="M56 50.2031V14H70V60.1562C70 65.5928 65.5928 70 60.1562 70C57.5605 70 54.9982 68.9992 53.1562 67.1573L0 14H19.7969L56 50.2031Z" />
			<path d="M147 56H133V23.9531L100.953 56H133V70H96.6875C85.8144 70 77 61.1856 77 50.3125V14H91V46.1562L123.156 14H91V0H127.312C138.186 0 147 8.81439 147 19.6875V56Z" />
		</svg>
	);
}

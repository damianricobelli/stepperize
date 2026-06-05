"use client";

import { Terminal } from "lucide-react";
import { useState } from "react";
import {
	installCommand,
	PACKAGE_MANAGERS,
	type PackageManager,
} from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

/**
 * The shadcn install command for a block: a package-manager-tabbed,
 * copyable `shadcn add` command. Pure command widget — surrounding actions
 * (v0, source, registry) are composed by the detail page's install section.
 */
export function BlockInstall({
	id,
	className,
}: {
	id: string;
	className?: string;
}) {
	const [pm, setPm] = useState<PackageManager>("npm");
	const command = installCommand(id, pm);

	return (
		<div
			className={cn(
				"overflow-hidden rounded-xl border bg-background",
				className,
			)}
		>
			<div className="flex items-center gap-1 border-b bg-muted/40 px-3 py-1.5">
				<Terminal className="mr-1 size-3.5 text-muted-foreground" aria-hidden />
				{PACKAGE_MANAGERS.map((m) => (
					<button
						key={m.id}
						type="button"
						onClick={() => setPm(m.id)}
						aria-pressed={pm === m.id}
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

			<div className="flex items-center justify-between gap-3 px-4 py-3">
				<code className="overflow-x-auto whitespace-nowrap font-mono text-sm text-foreground">
					<span className="select-none text-muted-foreground">$ </span>
					{command}
				</code>
				<CopyButton
					value={command}
					label="Copy install command"
					className="grid size-8 shrink-0 place-items-center rounded-md border bg-card"
				/>
			</div>
		</div>
	);
}

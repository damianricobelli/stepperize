"use client";

import { ExternalLink, Terminal } from "lucide-react";
import { CopyButton } from "@/components/blocks-gallery/copy-button";
import { registryUrl } from "@/lib/studio/share";
import { PACKAGE_MANAGERS, useStudio } from "./studio-provider";

export function useInstallCommand(): string {
	const { state, meta } = useStudio();
	const exec =
		PACKAGE_MANAGERS.find((pm) => pm.id === state.packageManager)?.exec ??
		"npx";
	return `${exec} shadcn@latest add ${registryUrl(meta.deferredConfig)}`;
}

export function InstallBar() {
	const { state, actions, meta } = useStudio();
	const command = useInstallCommand();
	const { dependencies, registryDependencies, usage } = meta.project;
	const localRegistry = registryUrl(meta.deferredConfig, "");

	return (
		<div className="grid gap-2.5 border-t bg-background px-4 py-3">
			<div className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/40 py-1 pr-1 pl-2">
				<Terminal
					aria-hidden
					className="size-3.5 shrink-0 text-muted-foreground"
				/>
				<select
					aria-label="Package manager"
					value={state.packageManager}
					onChange={(event) =>
						actions.setPackageManager(
							event.target.value as (typeof PACKAGE_MANAGERS)[number]["id"],
						)
					}
					className="h-6 shrink-0 rounded-md bg-background px-1 font-mono text-[11.5px] outline-none ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring"
				>
					{PACKAGE_MANAGERS.map((pm) => (
						<option key={pm.id} value={pm.id}>
							{pm.id}
						</option>
					))}
				</select>
				<code
					className="min-w-0 flex-1 truncate font-mono text-[12px]"
					title={command}
				>
					{command}
				</code>
				<CopyButton
					value={command}
					label="Copy install command"
					className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:text-primary-foreground pointer-fine:hover:bg-primary/90"
				>
					Copy
				</CopyButton>
			</div>
			<div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
				<p className="min-w-0">{usage}</p>
				<div className="flex flex-wrap items-center gap-1">
					{dependencies.map((dep) => (
						<span
							key={dep}
							className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground"
						>
							{dep}
						</span>
					))}
					{registryDependencies.map((dep) => (
						<span
							key={dep}
							className="rounded bg-accent px-1.5 py-0.5 font-mono text-[11px] text-accent-foreground"
						>
							ui/{dep}
						</span>
					))}
				</div>
				<a
					href={localRegistry}
					target="_blank"
					rel="noreferrer"
					className="ml-auto inline-flex items-center gap-1 font-medium hover:text-foreground"
				>
					Registry JSON <ExternalLink aria-hidden className="size-3" />
				</a>
			</div>
		</div>
	);
}

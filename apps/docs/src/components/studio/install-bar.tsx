"use client";

import { Download, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { registryUrl } from "@/lib/studio/share";
import { cn } from "@/lib/utils";
import { CopyButton, Segmented } from "./controls";
import {
	PACKAGE_MANAGERS,
	type PackageManager,
	useStudio,
} from "./studio-provider";

const PM_CHOICES = PACKAGE_MANAGERS.map((pm) => ({
	value: pm.id,
	label: pm.id,
}));

export function useInstallCommand(): string {
	const { state, meta } = useStudio();
	const exec =
		PACKAGE_MANAGERS.find((pm) => pm.id === state.packageManager)?.exec ??
		"npx";
	return `${exec} shadcn@latest add ${registryUrl(meta.deferredConfig)}`;
}

function InstallDetails() {
	const { state, actions, meta } = useStudio();
	const command = useInstallCommand();
	const { dependencies, registryDependencies, usage } = meta.project;

	return (
		<div className="grid min-w-0 grid-cols-1 gap-4">
			<div className="grid min-w-0 grid-cols-1 gap-2">
				<Segmented
					label="Package manager"
					value={state.packageManager}
					onChange={(pm: PackageManager) => actions.setPackageManager(pm)}
					choices={PM_CHOICES}
					itemClassName="font-mono text-xs"
				/>
				<div className="flex items-center gap-2 rounded-lg border bg-muted/40 py-1.5 pr-1.5 pl-3">
					{/* One scrollable line: the encoded config is long, the command shape is what matters. */}
					<code
						title={command}
						className="min-w-0 flex-1 overflow-x-auto font-mono text-xs whitespace-nowrap [scrollbar-width:none]"
					>
						{command}
					</code>
					<CopyButton
						value={command}
						label="Copy install command"
						variant="default"
						size="icon-xs"
						className="shrink-0"
					/>
				</div>
				<p className="text-xs text-pretty text-muted-foreground">{usage}</p>
			</div>

			<div className="grid gap-1.5">
				<p className="text-xs font-medium">Packages</p>
				<div className="flex flex-wrap gap-1">
					{dependencies.map((dep) => (
						<Badge key={dep} variant="secondary" className="font-mono">
							{dep}
						</Badge>
					))}
				</div>
			</div>

			{registryDependencies.length ? (
				<div className="grid gap-1.5">
					<p className="text-xs font-medium">shadcn/ui components</p>
					<div className="flex flex-wrap gap-1">
						{registryDependencies.map((dep) => (
							<Badge key={dep} variant="outline" className="font-mono">
								{dep}
							</Badge>
						))}
					</div>
				</div>
			) : null}

			<a
				href={registryUrl(meta.deferredConfig, "")}
				target="_blank"
				rel="noreferrer"
				className={cn(
					buttonVariants({ variant: "link", size: "xs" }),
					"justify-self-start px-0 text-muted-foreground",
				)}
			>
				View registry JSON <ExternalLink aria-hidden data-icon="inline-end" />
			</a>
		</div>
	);
}

/** The install command and what it brings, behind the toolbar's primary action. */
export function InstallButton() {
	return (
		<Popover>
			<PopoverTrigger render={<Button type="button" size="sm" />}>
				<Download aria-hidden data-icon="inline-start" />
				Install
			</PopoverTrigger>
			<PopoverContent
				align="end"
				className="w-[min(28rem,calc(100vw-2rem))] gap-4 p-4"
			>
				<PopoverHeader>
					<PopoverTitle>Install with the shadcn CLI</PopoverTitle>
					<PopoverDescription>
						Adds the generated files to your project.
					</PopoverDescription>
				</PopoverHeader>
				<InstallDetails />
			</PopoverContent>
		</Popover>
	);
}

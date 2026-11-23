import { Link } from "@tanstack/react-router";
import { Check, ChevronsUpDown } from "lucide-react";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DocsOption } from "@/lib/docs-tree";
import { cn } from "@/lib/utils";

/**
 * Two questions, two controls: which framework, then which version of its
 * documentation. The versions listed are the ones the chosen framework has.
 */
export function DocsSwitcher({
	frameworks,
	versions,
}: {
	frameworks: DocsOption[];
	versions: DocsOption[];
}) {
	return (
		<div className="flex gap-2">
			<Switcher label="Framework" options={frameworks} className="flex-1" />
			<Switcher label="Version" options={versions} className="w-20" />
		</div>
	);
}

function Switcher({
	label,
	options,
	className,
}: {
	label: string;
	options: DocsOption[];
	className?: string;
}) {
	const active = options.find((option) => option.active) ?? options[0];
	const trigger = cn(
		"flex h-9 min-w-0 items-center justify-between gap-1.5 rounded-lg border bg-fd-secondary/50 px-2.5 text-start text-sm font-medium text-fd-secondary-foreground outline-none",
		className,
	);

	// Nothing to choose: say which one it is without offering a menu.
	if (options.length < 2) {
		return (
			<span className={cn(trigger, "text-fd-muted-foreground")}>
				<span className="sr-only">{label}: </span>
				<span className="truncate">{active.title}</span>
			</span>
		);
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={`${label}: ${active.title}`}
				className={cn(
					trigger,
					"transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground focus-visible:ring-2 focus-visible:ring-fd-ring data-popup-open:bg-fd-accent",
				)}
			>
				<span className="truncate">{active.title}</span>
				<ChevronsUpDown
					aria-hidden
					className="size-3.5 shrink-0 text-fd-muted-foreground"
				/>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-auto min-w-(--anchor-width)">
				{options.map((option) => (
					<DropdownMenuItem
						key={option.id}
						className="items-start gap-2 py-1.5"
						render={
							<Link
								to="/docs/$"
								params={{ _splat: option.url.replace(/^\/docs\//, "") }}
								aria-current={option.active ? "page" : undefined}
							/>
						}
					>
						<span className="flex min-w-0 flex-col">
							<span className="font-medium">{option.title}</span>
							<span className="text-xs text-fd-muted-foreground">
								{option.description}
							</span>
						</span>
						<Check
							aria-hidden
							className={cn(
								"ms-auto mt-0.5 size-3.5 shrink-0",
								!option.active && "invisible",
							)}
						/>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

"use client";

import { Check, Copy } from "lucide-react";
import { useRef, useState } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
	CHOICE_LABELS,
	CHOICES,
	setFramework,
	useFramework,
} from "./framework-choice";

const MANAGERS = {
	npm: "npm i",
	pnpm: "pnpm add",
	yarn: "yarn add",
	bun: "bun add",
} as const;

/**
 * One entry per framework, React first, then the core. `@stepperize/core/dom`
 * is an entry of `@stepperize/core`: what you install is the package.
 */
const PACKAGES = CHOICES.map((entry) => ({
	id: entry.id,
	label: entry.title,
	package: entry.package.split("/").slice(0, 2).join("/"),
}));

type Manager = keyof typeof MANAGERS;
const MANAGER_IDS = Object.keys(MANAGERS) as Manager[];

/**
 * Copy-ready install command with a switch per package manager and a choice
 * of framework: the visitor's, shared with the rest of the page (React until
 * they pick one). Meeting the developer at whichever
 * tools they already use removes a tiny but real friction point on the path
 * to a first install.
 */
export function InstallTabs({ className }: { className?: string }) {
	const [manager, setManager] = useState<Manager>("npm");
	const framework = useFramework();
	const [copied, setCopied] = useState(false);
	const resetTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const pkg = PACKAGES.find((entry) => entry.id === framework) ?? PACKAGES[0];
	const cmd = `${MANAGERS[manager]} ${pkg.package}`;
	const activeIndex = MANAGER_IDS.indexOf(manager);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(cmd);
			setCopied(true);
			clearTimeout(resetTimer.current);
			resetTimer.current = setTimeout(() => setCopied(false), 1600);
		} catch {
			/* clipboard unavailable */
		}
	};

	return (
		<div
			className={cn(
				"w-full max-w-md overflow-hidden rounded-xl border bg-card text-left shadow-xs",
				className,
			)}
		>
			<div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-1.5 py-1.5">
				<fieldset className="relative grid grid-cols-4">
					<legend className="sr-only">Package manager</legend>
					{/* One sliding pill instead of four background swaps. */}
					<span
						aria-hidden
						className="absolute inset-y-0 left-0 w-1/4 rounded-md border bg-card shadow-xs transition-transform duration-200 ease-out-strong"
						style={{ transform: `translateX(${activeIndex * 100}%)` }}
					/>
					{MANAGER_IDS.map((m) => (
						<button
							key={m}
							type="button"
							aria-pressed={m === manager}
							onClick={() => setManager(m)}
							className={cn(
								"hit-44 h-7 w-14 rounded-md font-mono text-xs outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
								m === manager
									? "text-foreground"
									: "text-muted-foreground hover:text-foreground",
							)}
						>
							{m}
						</button>
					))}
				</fieldset>
				<Select
					items={CHOICE_LABELS}
					value={framework}
					onValueChange={(id) => {
						if (id) setFramework(id);
					}}
				>
					<SelectTrigger
						size="sm"
						aria-label="Framework"
						className="hit-44 h-7 gap-1.5 border-transparent bg-transparent pr-1.5 pl-2 text-xs font-medium text-muted-foreground hover:text-foreground dark:bg-transparent dark:hover:bg-transparent"
					>
						<FrameworkIcon id={pkg.id} className="size-3.5" />
						<SelectValue />
					</SelectTrigger>
					<SelectContent align="end" alignItemWithTrigger={false}>
						{PACKAGES.map((entry) => (
							<SelectItem key={entry.id} value={entry.id}>
								<FrameworkIcon id={entry.id} />
								{entry.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
			<div className="flex items-center gap-3 py-1.5 pr-1.5 pl-4">
				<code className="min-w-0 flex-1 truncate font-mono text-[13px]">
					<span className="text-muted-foreground select-none">$ </span>
					{cmd}
				</code>
				<button
					type="button"
					onClick={copy}
					aria-label={copied ? "Copied" : "Copy install command"}
					className="pressable relative inline-flex size-8 shrink-0 pointer-coarse:size-10 items-center justify-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
				>
					<Copy
						aria-hidden
						className={cn(
							"size-3.5 transition-[opacity,transform,filter] duration-200 ease-out-strong",
							copied && "scale-50 opacity-0 blur-[2px]",
						)}
					/>
					<Check
						aria-hidden
						className={cn(
							"absolute size-3.5 text-emerald-500 transition-[opacity,transform,filter] duration-200 ease-out-strong",
							!copied && "scale-50 opacity-0 blur-[2px]",
						)}
					/>
				</button>
				<span className="sr-only" aria-live="polite">
					{copied ? "Install command copied" : ""}
				</span>
			</div>
		</div>
	);
}

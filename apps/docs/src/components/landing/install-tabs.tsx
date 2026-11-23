"use client";

import { Check, ChevronDown, Copy } from "lucide-react";
import { useId, useRef, useState } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { BINDINGS, CORE_FRAMEWORK, FRAMEWORKS } from "@/lib/frameworks";
import { cn } from "@/lib/utils";

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
const PACKAGES = [
	...BINDINGS,
	...FRAMEWORKS.filter((entry) => entry.id === CORE_FRAMEWORK),
].map((entry) => ({
	id: entry.id,
	label: entry.title,
	package: entry.package.split("/").slice(0, 2).join("/"),
}));

type Manager = keyof typeof MANAGERS;
const MANAGER_IDS = Object.keys(MANAGERS) as Manager[];

/**
 * Copy-ready install command with a switch per package manager and a choice
 * of framework, which starts on React. Meeting the developer at whichever
 * tools they already use removes a tiny but real friction point on the path
 * to a first install.
 */
export function InstallTabs({ className }: { className?: string }) {
	const [manager, setManager] = useState<Manager>("npm");
	const [framework, setFramework] = useState<string>(PACKAGES[0].id);
	const [copied, setCopied] = useState(false);
	const frameworkId = useId();
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
				<label htmlFor={frameworkId} className="sr-only">
					Framework
				</label>
				{/* A native select: on a phone it opens the system picker. The logo
				    and chevron sit on top of it and let every tap through. */}
				<span className="relative inline-flex h-7 items-center rounded-md text-muted-foreground transition-colors duration-150 focus-within:ring-2 focus-within:ring-ring hover:text-foreground">
					<FrameworkIcon
						id={pkg.id}
						className="pointer-events-none absolute left-2 size-3.5"
					/>
					<select
						id={frameworkId}
						value={framework}
						onChange={(event) => setFramework(event.target.value)}
						// 16px on touch screens: iOS zooms the page into anything smaller.
						className="hit-44 h-7 max-w-[10.5rem] cursor-pointer appearance-none truncate rounded-md bg-transparent pr-6 pl-7 text-xs font-medium text-inherit outline-none pointer-coarse:text-base"
					>
						{PACKAGES.map((entry) => (
							<option key={entry.id} value={entry.id}>
								{entry.label}
							</option>
						))}
					</select>
					<ChevronDown
						aria-hidden
						className="pointer-events-none absolute right-1.5 size-3.5"
					/>
				</span>
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

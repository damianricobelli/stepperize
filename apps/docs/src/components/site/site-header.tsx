"use client";

import { Link } from "@tanstack/react-router";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { docPath, useFramework } from "@/components/landing/framework-choice";
import { HeaderStars } from "@/components/landing/social-proof";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";
import { cn } from "@/lib/utils";
import { Wordmark } from "./brand";

type NavTarget = "docs" | "blocks" | "studio" | "changelog";

/**
 * Shared top navigation for the marketing surfaces (landing, Blocks, Studio).
 * Every primary destination stays visible on phones: the bar is short enough
 * that a hamburger would only hide the two links people came for.
 */
export function SiteHeader({
	active,
	width = "contained",
}: {
	active?: NavTarget;
	/** `full` lines the bar up with full-bleed app surfaces such as the Studio. */
	width?: "contained" | "full";
}) {
	// Docs open on the framework the visitor picked (React until they do).
	const framework = useFramework();
	return (
		<header className="sticky top-[var(--fd-banner-height,0px)] z-40 border-b border-border/70 bg-background/85 backdrop-blur-md supports-backdrop-filter:bg-background/75">
			<div
				className={cn(
					"mx-auto flex h-14 w-full items-center gap-1 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))]",
					width === "contained" ? "max-w-7xl sm:px-6" : "sm:px-4",
				)}
			>
				<Link
					to="/"
					aria-label="Stepperize home"
					className="pressable -ml-1 mr-1 shrink-0 rounded-lg p-1 outline-none pointer-coarse:py-1.5 focus-visible:ring-2 focus-visible:ring-ring sm:mr-4"
				>
					{/* Below 480px the word and the three links don't fit together; the mark stays. */}
					<Wordmark wordClassName="max-[479px]:sr-only" />
				</Link>

				{/* Fits from 360px; narrower than that the links scroll inside the bar, never the page. */}
				<nav
					aria-label="Main"
					className="flex min-w-0 items-center overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
				>
					<NavLink
						active={active === "docs"}
						href={{
							to: "/docs/$",
							params: { _splat: docPath(framework, "intro") },
						}}
					>
						Docs
					</NavLink>
					{/* Blocks and Studio are shadcn/ui for React: marked at every width. */}
					<NavLink active={active === "blocks"} href={{ to: "/blocks" }}>
						Blocks
						<ReactMark />
					</NavLink>
					<NavLink active={active === "studio"} href={{ to: "/studio" }}>
						Studio
						<ReactMark />
					</NavLink>
					{/* The page itself: `/changelog` only redirects there. */}
					<NavLink
						active={active === "changelog"}
						href={{
							to: "/docs/$",
							params: { _splat: `${CURRENT_DOCS_VERSION}/react/changelog` },
						}}
						className="hidden md:inline-flex"
					>
						Changelog
					</NavLink>
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
					<SearchButton />
					<HeaderStars className="max-sm:hidden" />
					<ThemeToggle />
				</div>
			</div>
		</header>
	);
}

function NavLink({
	href,
	active,
	className,
	children,
}: {
	href:
		| { to: "/docs/$"; params: { _splat: string } }
		| { to: "/blocks" }
		| { to: "/studio" };
	active: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Link
			{...href}
			aria-current={active ? "page" : undefined}
			className={cn(
				"pressable inline-flex h-9 shrink-0 items-center rounded-lg px-1.5 text-sm font-medium pointer-coarse:h-11 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset min-[400px]:px-2.5 sm:px-3",
				active ? "text-foreground" : "text-muted-foreground",
				className,
			)}
		>
			{children}
		</Link>
	);
}

function ReactMark() {
	return (
		<span className="ml-1 inline-flex sm:ml-1.5" title="React">
			<FrameworkIcon id="react" className="size-3" />
			<span className="sr-only">(React)</span>
		</span>
	);
}

/** Opens the docs search dialog (same index and ⌘K hotkey as the docs). */
function SearchButton() {
	const { setOpenSearch, enabled } = useSearchContext();
	if (!enabled) return null;

	return (
		<button
			type="button"
			onClick={() => setOpenSearch(true)}
			aria-label="Search documentation"
			className="pressable inline-flex h-9 items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-lg:w-9 max-lg:justify-center pointer-coarse:max-lg:size-11 lg:w-52 lg:border lg:bg-card/60 lg:pr-1.5 lg:pl-3 lg:shadow-xs lg:hover:border-foreground/15"
		>
			<Search className="size-4 shrink-0" aria-hidden />
			<span className="hidden flex-1 text-left lg:inline">Search docs…</span>
			<kbd className="hidden h-5.5 items-center gap-0.5 rounded-md border bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground lg:inline-flex">
				<span className="text-xs">⌘</span>K
			</kbd>
		</button>
	);
}

/**
 * Both icons are always rendered and swapped with CSS on the `dark` class
 * next-themes sets before paint, so there is no mounted-state flash.
 */
function ThemeToggle() {
	const { resolvedTheme, setTheme } = useTheme();

	return (
		<button
			type="button"
			aria-label="Toggle color theme"
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
			className="pressable relative inline-flex size-9 pointer-coarse:size-11 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
		>
			<Moon
				aria-hidden
				className="size-[18px] transition-[opacity,transform,filter] duration-200 ease-out-strong dark:scale-75 dark:-rotate-45 dark:opacity-0 dark:blur-[2px]"
			/>
			<Sun
				aria-hidden
				className="absolute size-[18px] scale-75 rotate-45 opacity-0 blur-[2px] transition-[opacity,transform,filter] duration-200 ease-out-strong dark:scale-100 dark:rotate-0 dark:opacity-100 dark:blur-none"
			/>
		</button>
	);
}

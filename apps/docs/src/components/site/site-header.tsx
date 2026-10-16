"use client";

import { Link } from "@tanstack/react-router";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { HeaderStars } from "@/components/landing/social-proof";
import { cn } from "@/lib/utils";
import { Wordmark } from "./brand";

type NavTarget = "docs" | "blocks" | "changelog";

/**
 * Shared top navigation for the marketing surfaces (landing + Blocks gallery).
 * Every primary destination stays visible on phones: the bar is short enough
 * that a hamburger would only hide the two links people came for.
 */
export function SiteHeader({ active }: { active?: NavTarget }) {
	return (
		<header className="sticky top-[var(--fd-banner-height,0px)] z-40 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-backdrop-filter:bg-background/65">
			<div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-1 pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6">
				<Link
					to="/"
					aria-label="Stepperize home"
					className="pressable -ml-1 mr-1 rounded-lg p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mr-4"
				>
					<Wordmark />
				</Link>

				<nav aria-label="Main" className="flex items-center">
					<NavLink
						active={active === "docs"}
						href={{ to: "/docs/$", params: { _splat: "latest" } }}
					>
						Docs
					</NavLink>
					<NavLink active={active === "blocks"} href={{ to: "/blocks" }}>
						Blocks
					</NavLink>
					<NavLink
						active={active === "changelog"}
						href={{ to: "/changelog" }}
						className="hidden md:inline-flex"
					>
						Changelog
					</NavLink>
				</nav>

				<div className="ml-auto flex items-center gap-1">
					<SearchButton />
					<HeaderStars />
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
		| { to: "/changelog" };
	active: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<Link
			{...href}
			aria-current={active ? "page" : undefined}
			className={cn(
				"pressable inline-flex h-9 items-center rounded-lg px-2.5 text-sm font-medium outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:px-3",
				active ? "text-foreground" : "text-muted-foreground",
				className,
			)}
		>
			{children}
		</Link>
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
			className="pressable inline-flex h-9 items-center gap-2 rounded-lg text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring max-md:w-9 max-md:justify-center md:w-52 md:border md:bg-card/60 md:pr-1.5 md:pl-3 md:shadow-xs md:hover:border-foreground/15"
		>
			<Search className="size-4 shrink-0" aria-hidden />
			<span className="hidden flex-1 text-left md:inline">Search docs…</span>
			<kbd className="hidden h-5.5 items-center gap-0.5 rounded-md border bg-muted px-1.5 font-sans text-[11px] font-medium text-muted-foreground md:inline-flex">
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
			className="pressable relative inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
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

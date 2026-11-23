"use client";

import { Link } from "@tanstack/react-router";
import { useSearchContext } from "fumadocs-ui/contexts/search";
import { Menu, Moon, Search, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { type ReactNode, useState } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { docPath, useFramework } from "@/components/landing/framework-choice";
import { HeaderStars } from "@/components/landing/social-proof";
import {
	Drawer,
	DrawerContent,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { CURRENT_DOCS_VERSION } from "@/lib/docs-tree";
import { FRAMEWORKS } from "@/lib/frameworks";
import { cn } from "@/lib/utils";
import { Wordmark } from "./brand";

type NavTarget = "docs" | "blocks" | "studio" | "changelog";

type NavHref =
	| { to: "/docs/$"; params: { _splat: string } }
	| { to: "/blocks" }
	| { to: "/studio" };

type NavItem = {
	target: NavTarget;
	label: string;
	href: NavHref;
	/** Blocks and Studio are shadcn/ui for React: marked wherever they're listed. */
	reactOnly?: boolean;
};

function useNavItems(): NavItem[] {
	// Docs open on the framework the visitor picked (React until they do).
	const framework = useFramework();
	return [
		{
			target: "docs",
			label: "Docs",
			href: { to: "/docs/$", params: { _splat: docPath(framework, "intro") } },
		},
		{
			target: "blocks",
			label: "Blocks",
			href: { to: "/blocks" },
			reactOnly: true,
		},
		{
			target: "studio",
			label: "Studio",
			href: { to: "/studio" },
			reactOnly: true,
		},
		{
			// The page itself: `/changelog` only redirects there.
			target: "changelog",
			label: "Changelog",
			href: {
				to: "/docs/$",
				params: { _splat: `${CURRENT_DOCS_VERSION}/react/changelog` },
			},
		},
	];
}

/**
 * Shared top navigation for the marketing surfaces (landing, Blocks, Studio).
 * From `md` up every destination sits in the bar. On phones the bar keeps the
 * brand, search and a menu button; the links, GitHub and the theme live in a
 * bottom drawer, in reach of the thumb.
 */
export function SiteHeader({
	active,
	width = "contained",
}: {
	active?: NavTarget;
	/** `full` lines the bar up with full-bleed app surfaces such as the Studio. */
	width?: "contained" | "full";
}) {
	const items = useNavItems();
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
					className="pressable -ml-1 mr-1 shrink-0 rounded-lg p-1 outline-none pointer-coarse:py-1.5 focus-visible:ring-2 focus-visible:ring-ring md:mr-4"
				>
					<Wordmark />
				</Link>

				<nav aria-label="Main" className="hidden items-center md:flex">
					{items.map((item) => (
						<NavLink
							key={item.target}
							active={active === item.target}
							href={item.href}
						>
							{item.label}
							{item.reactOnly && <ReactMark />}
						</NavLink>
					))}
				</nav>

				<div className="ml-auto flex shrink-0 items-center gap-1">
					<SearchButton />
					<HeaderStars className="max-md:hidden" />
					<ThemeToggle className="max-md:hidden" />
					<MobileMenu active={active} items={items} />
				</div>
			</div>
		</header>
	);
}

const iconButton =
	"pressable relative inline-flex size-9 pointer-coarse:size-11 items-center justify-center rounded-lg text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

function MobileMenu({
	active,
	items,
}: {
	active?: NavTarget;
	items: NavItem[];
}) {
	const [open, setOpen] = useState(false);
	const framework = useFramework();
	const frameworkTitle = FRAMEWORKS.find((f) => f.id === framework)?.title;

	return (
		<Drawer open={open} onOpenChange={setOpen} showSwipeHandle>
			<DrawerTrigger
				render={
					<button
						type="button"
						aria-label="Open menu"
						className={cn(iconButton, "md:hidden")}
					/>
				}
			>
				<Menu aria-hidden className="size-5" />
			</DrawerTrigger>
			<DrawerContent className="md:hidden">
				<DrawerTitle className="sr-only">Menu</DrawerTitle>
				<nav aria-label="Main" className="flex flex-col gap-0.5 px-3 pt-2">
					{items.map((item) => {
						const isActive = active === item.target;
						return (
							<Link
								key={item.target}
								{...item.href}
								onClick={() => setOpen(false)}
								aria-current={isActive ? "page" : undefined}
								className={cn(
									"pressable flex h-12 items-center gap-3 rounded-xl px-3 text-base font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
									isActive
										? "bg-muted text-foreground"
										: "text-foreground/80 hover:bg-muted/60",
								)}
							>
								<span className="flex-1">{item.label}</span>
								{item.target === "docs" && frameworkTitle && (
									<MenuTag icon={framework}>{frameworkTitle}</MenuTag>
								)}
								{item.reactOnly && <MenuTag icon="react">React only</MenuTag>}
							</Link>
						);
					})}
				</nav>
				<div className="mx-6 mt-3 flex items-center justify-between border-t pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
					<HeaderStars className="-ml-2" />
					<ThemeToggle className="-mr-2" />
				</div>
			</DrawerContent>
		</Drawer>
	);
}

function MenuTag({ icon, children }: { icon: string; children: ReactNode }) {
	return (
		<span className="inline-flex items-center gap-1.5 text-[13px] font-normal text-muted-foreground">
			<FrameworkIcon id={icon} className="size-3.5" />
			{children}
		</span>
	);
}

function NavLink({
	href,
	active,
	className,
	children,
}: {
	href: NavHref;
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
function ThemeToggle({ className }: { className?: string }) {
	const { resolvedTheme, setTheme } = useTheme();

	return (
		<button
			type="button"
			aria-label="Toggle color theme"
			onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
			className={cn(iconButton, className)}
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

import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { FrameworkIcon } from "@/components/framework-icon";
import { GITHUB_URL } from "@/components/site/brand";
import { cta } from "@/components/site/cta";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { BeforeAfter } from "./before-after";
import { BlocksRail } from "./blocks-rail";
import { Features } from "./features";
import { FlowLogic } from "./flow-logic";
import { choiceOf, docPath, useFramework } from "./framework-choice";
import { FrameworkPicker, Frameworks } from "./frameworks";
import { HeroPlayground } from "./hero-playground";
import { InstallTabs } from "./install-tabs";
import { GitHubMark } from "./shared";
import { StatBar } from "./social-proof";

/**
 * "Get started" opens the first page of the visitor's framework. Doc links are
 * the splat after `/docs/`, fed to the router `Link` for client-side
 * navigation (no full reload).
 */
function useGetStarted() {
	return docPath(useFramework(), "start");
}

/**
 * The homepage, in the order a visitor's questions arrive: what is it (hero),
 * can I see it work (playground), can I trust it (stats), why not hand-roll it
 * (before/after), what can it do (flow logic + capabilities), does it fit my
 * stack (frameworks), how fast can I ship (blocks), and how do I start (final
 * CTA). React is the main binding and the default; a visitor who picks another
 * framework in the hero sees it in every snippet and link that has one. The
 * blocks and Studio stay visible and say plainly that they are React.
 */
export function LandingPage() {
	return (
		<div className="flex min-h-svh flex-col bg-background text-foreground">
			<SiteHeader />
			<main className="flex-1">
				<Hero />
				<BeforeAfter />
				<FlowLogic />
				<Features />
				<Frameworks />
				<BlocksRail />
				<FinalCta />
			</main>
			<SiteFooter />
		</div>
	);
}

/* ──────────────────────────────── Hero ──────────────────────────────── */

function Hero() {
	const getStarted = useGetStarted();
	return (
		<section className="relative overflow-clip">
			<HeroBackdrop />

			<div className="relative mx-auto w-full max-w-7xl px-4 pt-10 pb-16 sm:px-6 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-28">
				<div className="mx-auto flex max-w-4xl flex-col items-center text-center">
					<Link
						to="/studio"
						className="lp-rise pressable hit-44 group inline-flex items-center gap-2 rounded-full border bg-card py-1 pr-2.5 pl-1 text-[13px] text-muted-foreground shadow-xs outline-none hover:border-foreground/15 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
					>
						{/*
						 * Studio writes React and shadcn/ui code: say so up front, so a
						 * Vue visitor is not sent to a tool that is not for them yet.
						 */}
						<span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
							<FrameworkIcon
								id="react"
								className="size-3 text-primary dark:text-primary"
							/>
							React
						</span>
						<span>
							Stepper Studio
							<span className="max-sm:hidden">
								: build a flow with shadcn/ui, install it in one command
							</span>
						</span>
						<ArrowRight
							className="size-3.5 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5"
							aria-hidden
						/>
					</Link>

					<h1
						className="lp-rise mt-7 text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.045em] sm:text-6xl lg:text-[4.5rem]"
						style={{ animationDelay: "40ms" }}
					>
						The <span className="text-primary">type-safe</span> way to build{" "}
						<span className="whitespace-nowrap">multi-step</span> flows.
					</h1>

					{/*
					 * Everything under the headline enters as one: one animated layer
					 * instead of four, while the page is still hydrating.
					 */}
					<div
						className="lp-rise flex w-full flex-col items-center"
						style={{ animationDelay: "80ms" }}
					>
						<FrameworkPicker className="mt-5" />

						<p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
							Define your steps once. Stepperize infers every id, guards every
							move, and tells you exactly why a navigation failed, while your
							markup, forms, and design system stay yours.
						</p>

						<div className="mt-8 flex w-full flex-col items-center gap-3 sm:w-auto sm:flex-row">
							<Link
								to="/docs/$"
								params={{ _splat: getStarted }}
								className={cta({ size: "lg", className: "w-full sm:w-auto" })}
							>
								Get started
								<ArrowRight aria-hidden />
							</Link>
							{/* The blocks are shadcn/ui components for React: the button says so. */}
							<Link
								to="/blocks"
								className={cta({
									variant: "secondary",
									size: "lg",
									className: "w-full sm:w-auto",
								})}
							>
								<FrameworkIcon id="react" />
								Browse React blocks
							</Link>
						</div>

						<div className="mt-6 flex w-full justify-center">
							<InstallTabs />
						</div>
					</div>
				</div>

				<div
					className="lp-lift mx-auto mt-12 max-w-6xl sm:mt-16"
					style={{ animationDelay: "140ms" }}
				>
					<HeroPlayground />
					<p className="mx-auto mt-4 max-w-2xl text-center text-[13px] text-balance text-muted-foreground">
						Live: type an email, step through, then place the order. The
						highlighted lines follow the panel, in whichever framework you pick
						for the code: every binding runs the same flow.
					</p>
				</div>

				<StatBar className="mx-auto mt-12 max-w-4xl sm:mt-14" />
			</div>
		</section>
	);
}

/**
 * Static ambience: a masked dot grid and one soft radial wash of the brand
 * color. Painted once with gradients rather than a large `filter: blur()`,
 * and nothing loops, so it costs nothing after first paint.
 */
function HeroBackdrop() {
	return (
		<>
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[20px_20px] mask-[radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]"
			/>
			<div
				aria-hidden
				className="pointer-events-none absolute top-[-18rem] left-1/2 h-[42rem] w-[min(72rem,140vw)] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--primary)_16%,transparent),transparent)]"
			/>
		</>
	);
}

/* ─────────────────────────────── Final CTA ──────────────────────────── */

function FinalCta() {
	const getStarted = useGetStarted();
	const framework = choiceOf(useFramework());
	return (
		<section className="px-4 py-16 sm:px-6 sm:py-20 lg:py-28">
			<div className="relative mx-auto max-w-5xl overflow-clip rounded-[2rem] border bg-card px-5 py-12 text-center shadow-xl sm:px-12 sm:py-20">
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[20px_20px] mask-[radial-gradient(ellipse_60%_80%_at_50%_100%,black,transparent)]"
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute -bottom-48 left-1/2 h-96 w-[48rem] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklch,var(--primary)_18%,transparent),transparent)]"
				/>
				<div className="relative flex flex-col items-center">
					<h2 className="max-w-2xl text-3xl font-semibold leading-[1.08] tracking-[-0.035em] sm:text-5xl">
						Ship your first flow in minutes.
					</h2>
					<p className="mt-4 max-w-lg text-base text-muted-foreground sm:text-lg">
						Install the package, define your steps, render. The flat, typed API
						gets out of your way.
					</p>
					<InstallTabs className="mt-8" />
					<div className="mt-6 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
						<Link
							to="/docs/$"
							params={{ _splat: getStarted }}
							className={cta({ size: "lg", className: "w-full sm:w-auto" })}
						>
							Read the {framework.title} docs
							<ArrowRight aria-hidden />
						</Link>
						<a
							href={GITHUB_URL}
							target="_blank"
							rel="noreferrer noopener"
							className={cta({
								variant: "secondary",
								size: "lg",
								className: "w-full sm:w-auto",
							})}
						>
							<GitHubMark className="size-4" />
							Star on GitHub
						</a>
					</div>
				</div>
			</div>
		</section>
	);
}

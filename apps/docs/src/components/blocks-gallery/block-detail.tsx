"use client";

import { Link } from "@tanstack/react-router";
import {
	Accessibility,
	ArrowLeft,
	ArrowUpRight,
	Check,
	Code2,
	ExternalLink,
	Package,
	Paintbrush,
	Sparkles,
} from "lucide-react";
import {
	BLOCK_COMPONENTS,
	type BlockMeta,
	getBlockCode,
	getCategory,
	registryUrl,
	relatedBlocks,
	sourceUrl,
	v0Url,
} from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { DifficultyBadge } from "./block-badges";
import { BlockInstall } from "./block-install";
import { BlockPreviewFrame } from "./block-preview-frame";
import { HighlightedCode } from "./highlighted-code";

/**
 * Full detail page for a single block. The live block is the hero (clean
 * adaptive canvas, no device frame); install is a prominent, well-grouped action
 * area; source, notes, and related blocks follow.
 */
export function BlockDetail({
	block,
	codeHtml,
}: {
	block: BlockMeta;
	codeHtml?: string;
}) {
	const Preview = BLOCK_COMPONENTS[block.id];
	const code = getBlockCode(block.id);
	const category = getCategory(block.category);
	const related = relatedBlocks(block.id);
	const dependencies = blockDependencies(code);

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
			<Link
				to="/blocks"
				className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-4" aria-hidden />
				All blocks
			</Link>

			<header className="mt-6 flex flex-col gap-3">
				<div className="flex flex-wrap items-center gap-2">
					{category && (
						<Link
							to="/blocks"
							search={{ category: category.id }}
							className="rounded-full border bg-card/60 px-2.5 py-0.5 text-xs font-medium text-muted-foreground hover:text-foreground"
						>
							{category.name}
						</Link>
					)}
					<DifficultyBadge difficulty={block.difficulty} />
					{block.featured && (
						<span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
							<Sparkles className="size-3" aria-hidden />
							Featured
						</span>
					)}
				</div>
				<h1 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
					{block.title}
				</h1>
				<p className="max-w-2xl text-muted-foreground">{block.description}</p>
			</header>

			{/* Hero: the block itself on a clean adaptive canvas. */}
			{Preview && (
				<div className="mt-8 overflow-hidden rounded-2xl border bg-card/40">
					<BlockPreviewFrame minHeightClass="min-h-[26rem]">
						<Preview />
					</BlockPreviewFrame>
				</div>
			)}

			{/* Installation: the primary action area. */}
			<section className="mt-10 overflow-hidden rounded-2xl border bg-card/60">
				<div className="flex flex-col gap-1 border-b bg-muted/30 px-5 py-4 sm:px-6">
					<h2 className="font-heading text-lg font-semibold">Installation</h2>
					<p className="text-sm text-muted-foreground">
						Add it with the shadcn CLI, open it in v0, or read the source.
					</p>
				</div>

				<div className="space-y-5 p-5 sm:p-6">
					<BlockInstall id={block.id} />

					<div className="flex flex-wrap gap-2.5">
						<a
							href={v0Url(block.id)}
							target="_blank"
							rel="noreferrer noopener"
							className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
						>
							Open in
							<V0Logo className="h-3.5 w-auto" />
						</a>
						<a
							href={sourceUrl(block.id)}
							target="_blank"
							rel="noreferrer noopener"
							className="inline-flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-muted"
						>
							<Code2 className="size-4" aria-hidden />
							View source
						</a>
						<a
							href={registryUrl(block.id)}
							target="_blank"
							rel="noreferrer noopener"
							className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
						>
							Registry JSON
							<ExternalLink className="size-3.5" aria-hidden />
						</a>
					</div>

					<div className="grid gap-6 border-t pt-5 sm:grid-cols-2">
						<MetaList
							icon={<Package className="size-4" aria-hidden />}
							title="Dependencies"
							items={dependencies}
							mono
						/>
						<MetaList
							icon={<Check className="size-4" aria-hidden />}
							title="Requirements"
							items={REQUIREMENTS}
						/>
					</div>
				</div>
			</section>

			{/* Source */}
			<section className="mt-10">
				<SectionTitle>Source</SectionTitle>
				<HighlightedCode
					code={code}
					initialHtml={codeHtml}
					maxHeightClass="max-h-[40rem]"
				/>
			</section>

			{(block.useCase || block.accessibility || block.customization) && (
				<section className="mt-10 grid gap-5 md:grid-cols-2">
					{block.useCase && (
						<NoteCard
							icon={<Sparkles className="size-4" aria-hidden />}
							title="When to use it"
							className="md:col-span-2"
						>
							{block.useCase}
						</NoteCard>
					)}
					{block.accessibility && (
						<NoteCard
							icon={<Accessibility className="size-4" aria-hidden />}
							title="Accessibility"
						>
							{block.accessibility}
						</NoteCard>
					)}
					{block.customization && (
						<NoteCard
							icon={<Paintbrush className="size-4" aria-hidden />}
							title="Customization"
						>
							{block.customization}
						</NoteCard>
					)}
				</section>
			)}

			{related.length > 0 && (
				<section className="mt-10">
					<SectionTitle>Related blocks</SectionTitle>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
						{related.map((rel) => (
							<Link
								key={rel.id}
								to="/blocks/$blockId"
								params={{ blockId: rel.id }}
								className="group flex items-start justify-between gap-3 rounded-xl border bg-card/60 p-4 transition-colors hover:border-primary/40"
							>
								<span className="min-w-0">
									<span className="font-heading text-sm font-semibold group-hover:text-primary">
										{rel.title}
									</span>
									<span className="mt-1 line-clamp-2 block text-xs text-muted-foreground">
										{rel.description}
									</span>
								</span>
								<ArrowUpRight
									className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
									aria-hidden
								/>
							</Link>
						))}
					</div>
				</section>
			)}
		</div>
	);
}

const REQUIREMENTS = ["React 18 or later", "Tailwind CSS"];

function SectionTitle({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-muted-foreground">
			{children}
		</h2>
	);
}

function MetaList({
	icon,
	title,
	items,
	mono,
}: {
	icon: React.ReactNode;
	title: string;
	items: string[];
	mono?: boolean;
}) {
	return (
		<div>
			<div className="mb-2 flex items-center gap-2 text-sm font-semibold">
				<span className="text-muted-foreground">{icon}</span>
				{title}
			</div>
			<ul className="space-y-1.5">
				{items.map((item) => (
					<li
						key={item}
						className={cn(
							"text-sm text-muted-foreground",
							mono && "font-mono text-[0.8125rem]",
						)}
					>
						{item}
					</li>
				))}
			</ul>
		</div>
	);
}

function NoteCard({
	icon,
	title,
	children,
	className,
}: {
	icon: React.ReactNode;
	title: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={cn("rounded-2xl border bg-card/60 p-5", className)}>
			<div className="flex items-center gap-2">
				<span className="flex size-7 items-center justify-center rounded-lg border bg-background text-primary">
					{icon}
				</span>
				<h3 className="font-heading text-sm font-semibold">{title}</h3>
			</div>
			<p className="mt-2 text-sm leading-relaxed text-muted-foreground">
				{children}
			</p>
		</div>
	);
}

/** Mirror the registry's dependency detection for the detail page. */
function blockDependencies(code: string): string[] {
	const deps = ["@stepperize/react"];
	if (code.includes('from "lucide-react"')) deps.push("lucide-react");
	if (code.includes('from "zod"')) deps.push("zod");
	return deps;
}

function V0Logo({ className }: { className?: string }) {
	return (
		<svg
			fill="currentColor"
			viewBox="0 0 147 70"
			xmlns="http://www.w3.org/2000/svg"
			className={className}
			aria-hidden="true"
		>
			<path d="M56 50.2031V14H70V60.1562C70 65.5928 65.5928 70 60.1562 70C57.5605 70 54.9982 68.9992 53.1562 67.1573L0 14H19.7969L56 50.2031Z" />
			<path d="M147 56H133V23.9531L100.953 56H133V70H96.6875C85.8144 70 77 61.1856 77 50.3125V14H91V46.1562L123.156 14H91V0H127.312C138.186 0 147 8.81439 147 19.6875V56Z" />
		</svg>
	);
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FrameworkIcon } from "@/components/framework-icon";
import { SiteHeader } from "@/components/site/site-header";
import { StudioApp } from "@/components/studio/studio";
import { Badge } from "@/components/ui/badge";
import {
	breadcrumbLd,
	jsonLdScript,
	STUDIO_KEYWORDS,
	seo,
	studioApplicationLd,
	studioMeta,
} from "@/lib/seo";
import {
	DEFAULT_CONFIG,
	PRESET_IDS,
	PRESETS,
	type PresetId,
	type StudioConfig,
} from "@/lib/studio/config";
import { decodeConfig, encodeConfig } from "@/lib/studio/share";

type StudioSearch = { c?: string; preset?: PresetId };

export const Route = createFileRoute("/studio")({
	validateSearch: (search: Record<string, unknown>): StudioSearch => ({
		c: typeof search.c === "string" ? search.c : undefined,
		preset: PRESET_IDS.find((id) => id === search.preset),
	}),
	head: () => {
		const meta = studioMeta();
		// React only: the Studio generates @stepperize/react and shadcn/ui code.
		const head = seo({
			fullTitle: meta.title,
			description: meta.description,
			socialTitle: meta.socialTitle,
			socialDescription: meta.socialDescription,
			socialSection: "React · shadcn/ui",
			keywords: STUDIO_KEYWORDS,
			canonical: "/studio",
			type: "website",
		});
		return {
			...head,
			links: [
				...head.links,
				// How agents build and install a flow without the visual editor.
				{ rel: "alternate", type: "text/markdown", href: "/studio.md" },
			],
			scripts: [
				jsonLdScript(studioApplicationLd()),
				jsonLdScript(
					breadcrumbLd([
						{ name: "Stepperize", url: "/" },
						{ name: "Studio", url: "/studio" },
					]),
				),
			],
		};
	},
	component: StudioPage,
});

function StudioPage() {
	const search = Route.useSearch();
	const navigate = Route.useNavigate();
	// Read the URL once: after mount the Studio owns the config and mirrors it back.
	const [initialConfig] = useState<StudioConfig>(
		() =>
			decodeConfig(search.c) ??
			(search.preset ? PRESETS[search.preset].config : DEFAULT_CONFIG),
	);

	return (
		<div className="flex min-h-screen flex-col bg-background text-foreground lg:h-dvh lg:min-h-0">
			<SiteHeader active="studio" width="full" />
			{/*
			 * The Studio writes @stepperize/react and shadcn/ui code: said in
			 * plain sight, so a visitor from another framework knows before
			 * building a flow.
			 */}
			<div className="flex h-10 shrink-0 items-center gap-2 border-b pr-[max(0.75rem,env(safe-area-inset-right))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-4">
				<h1 className="text-sm font-semibold tracking-tight">Stepper Studio</h1>
				<Badge variant="secondary">
					<FrameworkIcon id="react" />
					React
				</Badge>
				<Badge variant="outline">shadcn/ui</Badge>
				<p className="ml-auto truncate text-xs text-muted-foreground max-md:hidden">
					Builds a flow and writes the @stepperize/react and shadcn/ui code for
					it.
				</p>
			</div>
			<StudioApp
				initialConfig={initialConfig}
				onConfigChange={(config) =>
					navigate({
						search: { c: encodeConfig(config) },
						replace: true,
						resetScroll: false,
					})
				}
			/>
		</div>
	);
}

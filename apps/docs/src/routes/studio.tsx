import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { StudioApp } from "@/components/studio/studio";
import { breadcrumbLd, jsonLdScript, seo } from "@/lib/seo";
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
		const head = seo({
			title: "Stepper Studio",
			description:
				"Configure a multi-step flow, pick your framework, form and validation libraries, and install the generated code with the shadcn CLI.",
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
			<h1 className="sr-only">Stepper Studio</h1>
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

"use client";

import { ClientOnly } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type { StudioConfig } from "@/lib/studio/config";
import { cn } from "@/lib/utils";
import { useStudio } from "../studio-provider";
import { PreviewFlow } from "./preview-flow";

/**
 * Everything that changes the flow's shape. When it changes the preview
 * remounts with a fresh definition; copy edits (descriptions) do not reset it.
 */
function shapeKey(config: StudioConfig, run: number): string {
	return JSON.stringify([
		run,
		config.name,
		config.navigation,
		config.validation,
		config.behavior,
		config.steps.map((s) => [s.title, s.fields]),
	]);
}

function PreviewSkeleton() {
	return (
		<div className="grid gap-5 p-7" aria-hidden>
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-5 w-1/3" />
			<div className="grid grid-cols-2 gap-4">
				<Skeleton className="h-9" />
				<Skeleton className="h-9" />
			</div>
		</div>
	);
}

export function PreviewStage() {
	const { state, meta } = useStudio();
	const config = meta.deferredConfig;
	const mobile = state.device === "mobile";
	// Lives above the keyed flow, so editing the config keeps the inspector open.
	const [inspect, setInspect] = useState(false);

	return (
		<div className="min-h-full bg-[radial-gradient(color-mix(in_oklch,var(--foreground)_9%,transparent)_1px,transparent_1px)] [background-size:16px_16px] p-4 sm:p-8">
			<div
				className={cn(
					"mx-auto overflow-hidden rounded-xl border bg-card shadow-lg transition-opacity duration-150",
					mobile ? "max-w-[390px]" : "max-w-3xl",
					meta.pending && "opacity-80",
				)}
			>
				<ClientOnly fallback={<PreviewSkeleton />}>
					<Suspense fallback={<PreviewSkeleton />}>
						<PreviewFlow
							key={shapeKey(config, state.previewRun)}
							config={config}
							names={meta.project.names}
							mobile={mobile}
							inspect={inspect}
							onInspectChange={setInspect}
						/>
					</Suspense>
				</ClientOnly>
			</div>
			<p className="mx-auto mt-3 max-w-3xl text-center text-xs text-balance text-muted-foreground">
				The preview runs the real{" "}
				<code className="font-mono">@stepperize/react</code> with your
				validation library. Its form is native; the generated code uses the form
				library you picked.
			</p>
		</div>
	);
}

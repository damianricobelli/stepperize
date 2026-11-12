"use client";

import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	FORM_OPTIONS,
	FRAMEWORK_OPTIONS,
	INDICATOR_OPTIONS,
	LAYOUT_OPTIONS,
	NAVIGATION_OPTIONS,
	PRESET_IDS,
	PRESETS,
	type PresetId,
	type StudioBehavior,
	UI_OPTIONS,
	unavailableReason,
	VALIDATION_OPTIONS,
} from "@/lib/studio/config";
import {
	ChoiceCards,
	Section,
	Segmented,
	SwitchRow,
	ThumbnailPicker,
} from "./controls";
import { LayoutThumbnail } from "./layout-thumbnail";
import { StepsEditor } from "./steps-editor";
import { useStudio } from "./studio-provider";

const BEHAVIORS: {
	key: keyof StudioBehavior;
	label: string;
	description: ReactNode;
}[] = [
	{
		key: "linear",
		label: "Linear navigation",
		description: <>Only the next step is reachable.</>,
	},
	{
		key: "guard",
		label: "Validate before moving on",
		description: (
			<>
				<code className="font-mono text-[11px]">beforeStepChange</code> runs the
				step schema.
			</>
		),
	},
	{
		key: "persist",
		label: "Save a draft",
		description: <>Restores flow data from localStorage.</>,
	},
	{
		key: "keepMounted",
		label: "Keep steps mounted",
		description: (
			<>
				Unsaved fields survive Back.{" "}
				<code className="font-mono text-[11px]">forceMount</code>
			</>
		),
	},
];

/** Example URL for each navigation mode, using the flow's real slug and second step. */
function useExampleUrls() {
	const { meta } = useStudio();
	const { slug, stepIds } = meta.project.names;
	const step = stepIds[1] ?? stepIds[0];
	return {
		component: `/${slug}`,
		"search-params": `/${slug}?step=${step}`,
		routes: `/${slug}/${step}`,
	};
}

function BehaviorSwitches({ keys }: { keys: (keyof StudioBehavior)[] }) {
	const { state, actions } = useStudio();
	const { config } = state;
	return (
		<div className="grid gap-4 rounded-lg border bg-card p-3">
			{BEHAVIORS.filter((behavior) => keys.includes(behavior.key)).map(
				(behavior) => (
					<SwitchRow
						key={behavior.key}
						id={`behavior-${behavior.key}`}
						label={behavior.label}
						description={behavior.description}
						checked={config.behavior[behavior.key]}
						disabledReason={unavailableReason(config, {
							kind: "behavior",
							value: behavior.key,
						})}
						onCheckedChange={(checked) => {
							actions.update((c) => ({
								...c,
								behavior: { ...c.behavior, [behavior.key]: checked },
							}));
							actions.restartPreview();
						}}
					/>
				),
			)}
		</div>
	);
}

const TEMPLATE_LABELS = Object.fromEntries(
	PRESET_IDS.map((id) => [id, PRESETS[id].label]),
) as Record<PresetId, string>;

const TAB_CONTENT = "grid content-start gap-7 p-4 pb-8";

/**
 * The configuration panel. A fixed header picks the template and names the
 * flow; tabs group the rest from what you see to where it runs: Design, Steps,
 * Data, Routing. Each behavior switch lives next to the choice it modifies.
 */
export function ConfigPanel() {
	const { state, actions, meta } = useStudio();
	const { config } = state;
	const urls = useExampleUrls();
	const fieldCount = config.steps.reduce((n, s) => n + s.fields.length, 0);

	return (
		<Tabs defaultValue="design" className="flex min-h-0 flex-1 flex-col gap-0">
			<div className="flex h-12 shrink-0 items-center border-b px-3">
				<TabsList className="w-full">
					<TabsTrigger value="design">Design</TabsTrigger>
					<TabsTrigger value="steps">
						Steps
						<span className="text-[11px] text-muted-foreground tabular-nums">
							{config.steps.length}
						</span>
					</TabsTrigger>
					<TabsTrigger value="data">Data</TabsTrigger>
					<TabsTrigger value="routing">Routing</TabsTrigger>
				</TabsList>
			</div>

			<ScrollArea className="min-h-0 flex-1">
				<TabsContent value="design" className={TAB_CONTENT}>
					<Section
						title="Template"
						description="Loading a template replaces the current flow."
						aside={
							meta.presetId ? null : (
								<Badge variant="secondary" className="font-normal">
									Edited
								</Badge>
							)
						}
					>
						<Select
							items={TEMPLATE_LABELS}
							value={meta.presetId ?? null}
							onValueChange={(id) => {
								if (id) actions.loadPreset(id as PresetId);
							}}
						>
							<SelectTrigger aria-label="Template" className="w-full">
								<SelectValue placeholder="Custom flow" />
							</SelectTrigger>
							<SelectContent>
								{PRESET_IDS.map((id) => (
									<SelectItem key={id} value={id}>
										{PRESETS[id].label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</Section>
					<Section
						title="Layout"
						description="How progress is drawn above or beside the step."
						aside={<code className="font-mono">Stepper.List</code>}
					>
						<ThumbnailPicker
							name="studio-layout"
							label="Layout"
							value={config.layout}
							onChange={(layout) => actions.update((c) => ({ ...c, layout }))}
							choices={LAYOUT_OPTIONS}
							renderThumbnail={(layout) => <LayoutThumbnail layout={layout} />}
						/>
					</Section>
					<Section title="Indicator" description="What each step marker shows.">
						<Segmented
							label="Indicator"
							value={config.indicator}
							onChange={(indicator) =>
								actions.update((c) => ({ ...c, indicator }))
							}
							choices={INDICATOR_OPTIONS}
						/>
					</Section>
					<Section
						title="Components"
						description="What the fields and buttons are built with."
					>
						<ChoiceCards
							name="studio-ui"
							label="UI kit"
							value={config.ui}
							onChange={(ui) => actions.update((c) => ({ ...c, ui }))}
							choices={UI_OPTIONS}
						/>
					</Section>
				</TabsContent>

				<TabsContent value="steps" className={TAB_CONTENT}>
					<Section
						title="Steps"
						description="The last step without fields becomes a summary."
						aside={`${config.steps.length} steps · ${fieldCount} fields`}
					>
						<StepsEditor />
					</Section>
				</TabsContent>

				<TabsContent value="data" className={TAB_CONTENT}>
					<Section
						title="Form library"
						description="Binds the fields and submits each step."
					>
						<ChoiceCards
							name="studio-form"
							label="Form library"
							columns={2}
							value={config.form}
							onChange={(form) => actions.update((c) => ({ ...c, form }))}
							choices={FORM_OPTIONS}
						/>
					</Section>
					<Section
						title="Validation"
						description={
							config.form === "conform"
								? "Conform parses submissions with Zod or Valibot."
								: "Any Standard Schema library works with Stepperize."
						}
					>
						<Segmented
							label="Validation"
							value={config.validation}
							onChange={(validation) => {
								actions.update((c) => ({ ...c, validation }));
								actions.restartPreview();
							}}
							choices={VALIDATION_OPTIONS.map((option) => ({
								...option,
								disabledReason: unavailableReason(config, {
									kind: "validation",
									value: option.value,
								}),
							}))}
						/>
					</Section>
					<Section title="Data behavior">
						<BehaviorSwitches keys={["guard", "persist", "keepMounted"]} />
					</Section>
				</TabsContent>

				<TabsContent value="routing" className={TAB_CONTENT}>
					<Section
						title="Navigation"
						description="Where the current step lives."
					>
						<ChoiceCards
							name="studio-navigation"
							label="Navigation"
							value={config.navigation}
							onChange={(navigation) => {
								actions.update((c) => ({ ...c, navigation }));
								actions.restartPreview();
							}}
							aside={(value) => urls[value]}
							choices={NAVIGATION_OPTIONS.map((option) => ({
								...option,
								disabledReason: unavailableReason(config, {
									kind: "navigation",
									value: option.value,
								}),
							}))}
						/>
					</Section>
					<Section
						title="Framework"
						description="Only the route files change between frameworks."
					>
						<ChoiceCards
							name="studio-framework"
							label="Framework"
							columns={2}
							value={config.framework}
							onChange={(framework) =>
								actions.update((c) => ({ ...c, framework }))
							}
							choices={FRAMEWORK_OPTIONS}
						/>
					</Section>
					<Section title="Step order">
						<BehaviorSwitches keys={["linear"]} />
					</Section>
				</TabsContent>
			</ScrollArea>
		</Tabs>
	);
}

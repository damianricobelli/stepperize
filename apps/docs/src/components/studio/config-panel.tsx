"use client";

import {
	FORM_OPTIONS,
	FRAMEWORK_OPTIONS,
	INDICATOR_OPTIONS,
	LAYOUT_OPTIONS,
	NAVIGATION_OPTIONS,
	PRESET_IDS,
	PRESETS,
	type StudioBehavior,
	UI_OPTIONS,
	unavailableReason,
	VALIDATION_OPTIONS,
} from "@/lib/studio/config";
import { cn } from "@/lib/utils";
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
	description: React.ReactNode;
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

/** Example URL for each navigation mode, using the flow's real slug and first step. */
function useExampleUrls() {
	const { meta } = useStudio();
	const { slug, stepIds } = meta.project.names;
	return {
		component: `/${slug}`,
		"search-params": `/${slug}?step=${stepIds[1] ?? stepIds[0]}`,
		routes: `/${slug}/${stepIds[1] ?? stepIds[0]}`,
	};
}

export function ConfigPanel({ className }: { className?: string }) {
	const { state, actions, meta } = useStudio();
	const { config } = state;
	const urls = useExampleUrls();

	return (
		<div className={cn("min-h-0", className)}>
			<Section title="Start from" aside={meta.presetId ? null : "Edited"}>
				<div className="flex flex-wrap gap-1.5">
					{PRESET_IDS.map((id) => (
						<button
							key={id}
							type="button"
							aria-pressed={meta.presetId === id}
							onClick={() => actions.loadPreset(id)}
							className="pressable h-7 rounded-full border bg-card px-3 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-accent aria-pressed:text-accent-foreground pointer-fine:hover:not-aria-pressed:border-foreground/20"
						>
							{PRESETS[id].label}
						</button>
					))}
				</div>
				<label className="grid gap-1.5">
					<span className="text-xs text-muted-foreground">Flow name</span>
					<input
						value={config.name}
						maxLength={40}
						onChange={(event) =>
							actions.update((c) => ({ ...c, name: event.target.value }))
						}
						className="h-8 rounded-md border border-input bg-background px-2.5 text-[13px] outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
					/>
				</label>
			</Section>

			<Section title="Framework">
				<Segmented
					label="Framework"
					value={config.framework}
					onChange={(framework) => actions.update((c) => ({ ...c, framework }))}
					choices={FRAMEWORK_OPTIONS}
				/>
			</Section>

			<Section title="Navigation" aside="Where the step lives">
				<fieldset aria-label="Navigation" className="grid gap-1.5">
					{NAVIGATION_OPTIONS.map((option) => {
						const reason = unavailableReason(config, {
							kind: "navigation",
							value: option.value,
						});
						return (
							<button
								key={option.value}
								type="button"
								aria-pressed={config.navigation === option.value}
								disabled={Boolean(reason)}
								onClick={() => {
									actions.update((c) => ({ ...c, navigation: option.value }));
									actions.restartPreview();
								}}
								className="pressable grid gap-1 rounded-lg border bg-card px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-accent/60 aria-pressed:shadow-[0_0_0_1px_var(--primary)] pointer-fine:hover:not-disabled:not-aria-pressed:border-foreground/20"
							>
								<span className="flex items-baseline justify-between gap-3">
									<span className="text-[13px] font-medium">
										{option.label}
									</span>
									<code className="truncate font-mono text-[11px] text-muted-foreground">
										{urls[option.value]}
									</code>
								</span>
								<span className="text-xs leading-snug text-muted-foreground">
									{reason ?? option.hint}
								</span>
							</button>
						);
					})}
				</fieldset>
			</Section>

			<Section
				title="Layout"
				aside={<code className="font-mono">Stepper.List</code>}
			>
				<ThumbnailPicker
					label="Layout"
					value={config.layout}
					onChange={(layout) => actions.update((c) => ({ ...c, layout }))}
					choices={LAYOUT_OPTIONS}
					renderThumbnail={(layout) => <LayoutThumbnail layout={layout} />}
				/>
				<Segmented
					label="Indicator"
					value={config.indicator}
					onChange={(indicator) => actions.update((c) => ({ ...c, indicator }))}
					choices={INDICATOR_OPTIONS}
				/>
			</Section>

			<Section
				title="Steps"
				aside={`${config.steps.length} steps · ${config.steps.reduce((n, s) => n + s.fields.length, 0)} fields`}
			>
				<StepsEditor />
			</Section>

			<Section title="Form library">
				<ChoiceCards
					label="Form library"
					columns={2}
					value={config.form}
					onChange={(form) => actions.update((c) => ({ ...c, form }))}
					choices={FORM_OPTIONS}
				/>
			</Section>

			<Section title="Validation" aside="Standard Schema">
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
				{config.form === "conform" ? (
					<p className="text-xs text-muted-foreground">
						Conform parses submissions with Zod or Valibot.
					</p>
				) : null}
			</Section>

			<Section title="UI">
				<ChoiceCards
					label="UI kit"
					value={config.ui}
					onChange={(ui) => actions.update((c) => ({ ...c, ui }))}
					choices={UI_OPTIONS}
				/>
			</Section>

			<Section title="Behavior">
				<div className="grid">
					{BEHAVIORS.map((behavior) => (
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
					))}
				</div>
			</Section>
		</div>
	);
}

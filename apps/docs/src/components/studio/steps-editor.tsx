"use client";

import { ArrowDown, ArrowUp, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { deriveNames } from "@/lib/studio/codegen/shared";
import {
	CHOICE_TYPES,
	type FieldType,
	LIMITS,
	type StudioConfig,
	type StudioField,
	type StudioStep,
} from "@/lib/studio/config";
import { FIELD_GROUPS, FIELD_KINDS, sliderRange } from "@/lib/studio/fields";
import { useStudio } from "./studio-provider";

/** Labels for `<Select.Value>`, so the trigger shows "Radio group", not "radio". */
const FIELD_TYPE_LABELS = Object.fromEntries(
	Object.entries(FIELD_KINDS).map(([type, kind]) => [type, kind.label]),
) as Record<FieldType, string>;

function updateStep(
	config: StudioConfig,
	index: number,
	patch: (step: StudioStep) => StudioStep,
): StudioConfig {
	return {
		...config,
		steps: config.steps.map((step, i) => (i === index ? patch(step) : step)),
	};
}

function updateField(
	step: StudioStep,
	index: number,
	patch: Partial<StudioField>,
): StudioStep {
	return {
		...step,
		fields: step.fields.map((field, i) =>
			i === index ? { ...field, ...patch } : field,
		),
	};
}

/** Options are typed as text and committed on blur, so a trailing comma survives typing. */
function OptionsInput({
	options,
	onCommit,
	label,
}: {
	options: string[];
	onCommit: (options: string[]) => void;
	label: string;
}) {
	const [draft, setDraft] = useState(options.join(", "));
	const commit = () => {
		const next = [
			...new Set(
				draft
					.split(",")
					.map((o) => o.trim().slice(0, LIMITS.option))
					.filter(Boolean),
			),
		].slice(0, LIMITS.options);
		const safe = next.length ? next : ["Option A"];
		onCommit(safe);
		setDraft(safe.join(", "));
	};
	return (
		<Input
			aria-label={`${label} options`}
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === "Enter") commit();
			}}
			placeholder="Comma-separated options"
			className="h-7 text-xs"
		/>
	);
}

/** A bound typed freely and committed on blur, so "-" or an empty box can be typed through. */
function BoundInput({
	label,
	value,
	onCommit,
}: {
	label: string;
	value: number;
	onCommit: (value: number) => void;
}) {
	const [draft, setDraft] = useState(String(value));
	const commit = () => {
		const next = Number.parseInt(draft, 10);
		const safe = Number.isFinite(next)
			? Math.min(Math.max(next, LIMITS.range.min), LIMITS.range.max)
			: value;
		onCommit(safe);
		setDraft(String(safe));
	};
	return (
		<Field orientation="horizontal" className="gap-1.5">
			<FieldLabel className="text-xs font-normal text-muted-foreground">
				{label}
			</FieldLabel>
			<Input
				aria-label={label}
				inputMode="numeric"
				value={draft}
				onChange={(event) => setDraft(event.target.value)}
				onBlur={commit}
				onKeyDown={(event) => {
					if (event.key === "Enter") commit();
				}}
				className="h-7 text-xs tabular-nums"
			/>
		</Field>
	);
}

function FieldRow({
	stepIndex,
	fieldIndex,
	field,
	name,
}: {
	stepIndex: number;
	fieldIndex: number;
	field: StudioField;
	name: string;
}) {
	const { actions } = useStudio();
	const patch = (next: Partial<StudioField>) =>
		actions.update((c) =>
			updateStep(c, stepIndex, (s) => updateField(s, fieldIndex, next)),
		);
	const { min, max } = sliderRange(field);
	const requiredId = `field-${stepIndex}-${fieldIndex}-required`;

	return (
		<div className="grid gap-1.5 rounded-lg border bg-background p-2">
			<div className="flex items-center gap-1.5">
				<Input
					aria-label="Field label"
					title={`name: ${name}`}
					value={field.label}
					maxLength={LIMITS.label}
					onChange={(event) => patch({ label: event.target.value })}
					className="h-7 text-xs"
				/>
				<Button
					type="button"
					variant="ghost"
					size="icon-xs"
					aria-label={`Remove ${field.label}`}
					onClick={() =>
						actions.update((c) =>
							updateStep(c, stepIndex, (s) => ({
								...s,
								fields: s.fields.filter((_, k) => k !== fieldIndex),
							})),
						)
					}
				>
					<X aria-hidden />
				</Button>
			</div>
			<div className="flex items-center gap-1.5">
				<Select
					items={FIELD_TYPE_LABELS}
					value={field.type}
					onValueChange={(type) => {
						if (type) patch({ type: type as FieldType });
					}}
				>
					<SelectTrigger
						size="sm"
						aria-label="Field type"
						className="min-w-0 flex-1 text-xs"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent alignItemWithTrigger={false}>
						{FIELD_GROUPS.map(({ group, types }) => (
							<SelectGroup key={group}>
								<SelectLabel>{group}</SelectLabel>
								{types.map((type) => (
									<SelectItem key={type} value={type}>
										{FIELD_KINDS[type].label}
									</SelectItem>
								))}
							</SelectGroup>
						))}
					</SelectContent>
				</Select>
				<Field
					orientation="horizontal"
					data-disabled={field.type === "slider"}
					className="w-auto shrink-0 gap-1.5"
					title={
						field.type === "slider"
							? "A slider always holds a value"
							: "Required fields must be filled in before Continue"
					}
				>
					<Switch
						id={requiredId}
						size="sm"
						disabled={field.type === "slider"}
						checked={field.type === "slider" || field.required}
						onCheckedChange={(required) => patch({ required })}
					/>
					<FieldLabel
						htmlFor={requiredId}
						className="text-xs font-normal text-muted-foreground"
					>
						Required
					</FieldLabel>
				</Field>
			</div>
			{CHOICE_TYPES.has(field.type) ? (
				<OptionsInput
					key={(field.options ?? []).join("|")}
					label={field.label}
					options={field.options ?? []}
					onCommit={(options) => patch({ options })}
				/>
			) : null}
			{field.type === "slider" ? (
				<div key={`${min}:${max}`} className="grid grid-cols-2 gap-2">
					<BoundInput
						label="Min"
						value={min}
						onCommit={(next) => patch({ min: next })}
					/>
					<BoundInput
						label="Max"
						value={max}
						onCommit={(next) => patch({ max: next })}
					/>
				</div>
			) : null}
		</div>
	);
}

export function StepsEditor() {
	const { state, actions } = useStudio();
	const { config } = state;
	const [open, setOpen] = useState<number[]>([0]);
	const names = deriveNames(config);
	const last = config.steps.length - 1;

	const move = (from: number, to: number) => {
		actions.update((c) => {
			const steps = [...c.steps];
			[steps[from], steps[to]] = [steps[to], steps[from]];
			return { ...c, steps };
		});
		setOpen([to]);
		actions.restartPreview();
	};

	return (
		<div className="grid gap-2">
			<Accordion
				value={open}
				onValueChange={(next) => setOpen(next as number[])}
				className="gap-2"
			>
				{config.steps.map((step, index) => (
					<AccordionItem
						key={index}
						value={index}
						className="rounded-lg border bg-card not-last:border-b"
					>
						<AccordionTrigger className="items-center gap-2 px-2.5 py-2 hover:no-underline">
							<Badge
								variant="secondary"
								className="size-5 shrink-0 rounded-full p-0 tabular-nums"
							>
								{index + 1}
							</Badge>
							<span className="min-w-0 flex-1 truncate text-[13px]">
								{step.title || "Untitled step"}
							</span>
							<span className="shrink-0 font-mono text-[11px] font-normal text-muted-foreground">
								{step.fields.length
									? `${step.fields.length} field${step.fields.length > 1 ? "s" : ""}`
									: index === last
										? "summary"
										: "content"}
							</span>
						</AccordionTrigger>
						<AccordionContent className="grid gap-3 border-t px-2.5 pt-3 pb-2.5">
							<Field className="gap-1.5">
								<FieldLabel htmlFor={`step-${index}-title`} className="text-xs">
									Title
								</FieldLabel>
								<Input
									id={`step-${index}-title`}
									value={step.title}
									maxLength={LIMITS.label}
									onChange={(event) =>
										actions.update((c) =>
											updateStep(c, index, (s) => ({
												...s,
												title: event.target.value,
											})),
										)
									}
									className="h-7 text-xs"
								/>
							</Field>
							<Field className="gap-1.5">
								<FieldLabel
									htmlFor={`step-${index}-description`}
									className="text-xs"
								>
									Description
								</FieldLabel>
								<Input
									id={`step-${index}-description`}
									value={step.description}
									maxLength={LIMITS.description}
									placeholder="Optional"
									onChange={(event) =>
										actions.update((c) =>
											updateStep(c, index, (s) => ({
												...s,
												description: event.target.value,
											})),
										)
									}
									className="h-7 text-xs"
								/>
							</Field>

							<div className="grid gap-1.5">
								<p className="text-xs font-medium">Fields</p>
								{step.fields.length === 0 ? (
									<p className="rounded-lg border border-dashed px-2.5 py-2 text-xs text-muted-foreground">
										{index === last
											? "No fields: this step summarizes the flow."
											: "No fields: this step renders your own content."}
									</p>
								) : null}
								{step.fields.map((field, j) => (
									<FieldRow
										key={j}
										stepIndex={index}
										fieldIndex={j}
										field={field}
										name={names.fields[index][j]}
									/>
								))}
								<Button
									type="button"
									variant="outline"
									size="sm"
									disabled={step.fields.length >= LIMITS.fields}
									onClick={() =>
										actions.update((c) =>
											updateStep(c, index, (s) => ({
												...s,
												fields: [
													...s.fields,
													{
														label: `Field ${s.fields.length + 1}`,
														type: "text",
														required: true,
													},
												],
											})),
										)
									}
									className="justify-self-start"
								>
									<Plus aria-hidden data-icon="inline-start" /> Add field
								</Button>
							</div>

							<div className="flex items-center gap-2 border-t pt-2.5">
								<code className="min-w-0 flex-1 truncate font-mono text-[11px] text-muted-foreground">
									id "{names.stepIds[index]}"
								</code>
								<ButtonGroup aria-label="Step actions">
									<Button
										type="button"
										variant="outline"
										size="icon-xs"
										aria-label="Move step up"
										disabled={index === 0}
										onClick={() => move(index, index - 1)}
									>
										<ArrowUp aria-hidden />
									</Button>
									<Button
										type="button"
										variant="outline"
										size="icon-xs"
										aria-label="Move step down"
										disabled={index === last}
										onClick={() => move(index, index + 1)}
									>
										<ArrowDown aria-hidden />
									</Button>
									<Button
										type="button"
										variant="outline"
										size="icon-xs"
										aria-label={`Delete ${step.title}`}
										disabled={config.steps.length <= LIMITS.steps.min}
										onClick={() => {
											actions.update((c) => ({
												...c,
												steps: c.steps.filter((_, k) => k !== index),
											}));
											setOpen([]);
											actions.restartPreview();
										}}
										className="pointer-fine:hover:text-destructive"
									>
										<Trash2 aria-hidden />
									</Button>
								</ButtonGroup>
							</div>
						</AccordionContent>
					</AccordionItem>
				))}
			</Accordion>
			<Button
				type="button"
				variant="outline"
				disabled={config.steps.length >= LIMITS.steps.max}
				onClick={() => {
					// New steps go before the summary step, where content usually belongs.
					actions.update((c) => {
						const steps = [...c.steps];
						steps.splice(steps.length - 1, 0, {
							title: `Step ${steps.length}`,
							description: "",
							fields: [{ label: "Name", type: "text", required: true }],
						});
						return { ...c, steps };
					});
					setOpen([config.steps.length - 1]);
					actions.restartPreview();
				}}
				className="border-dashed"
			>
				<Plus aria-hidden data-icon="inline-start" /> Add step
			</Button>
		</div>
	);
}

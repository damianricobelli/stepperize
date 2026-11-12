"use client";

import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { deriveNames } from "@/lib/studio/codegen/shared";
import {
	FIELD_TYPES,
	type FieldType,
	LIMITS,
	type StudioConfig,
	type StudioField,
	type StudioStep,
} from "@/lib/studio/config";
import { cn } from "@/lib/utils";
import { useStudio } from "./studio-provider";

const ICON_BUTTON =
	"pressable grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30 pointer-fine:hover:bg-muted pointer-fine:hover:text-foreground";
const INPUT =
	"h-8 min-w-0 rounded-md border border-input bg-background px-2 text-[13px] outline-none transition-[border-color,box-shadow] duration-150 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40";

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
		<input
			aria-label={`${label} options`}
			value={draft}
			onChange={(event) => setDraft(event.target.value)}
			onBlur={commit}
			onKeyDown={(event) => {
				if (event.key === "Enter") commit();
			}}
			placeholder="Comma-separated options"
			className={cn(INPUT, "col-span-full")}
		/>
	);
}

export function StepsEditor() {
	const { state, actions } = useStudio();
	const { config } = state;
	const [open, setOpen] = useState<number | null>(0);
	const names = deriveNames(config);
	const last = config.steps.length - 1;

	const move = (from: number, to: number) => {
		actions.update((c) => {
			const steps = [...c.steps];
			[steps[from], steps[to]] = [steps[to], steps[from]];
			return { ...c, steps };
		});
		setOpen(to);
		actions.restartPreview();
	};

	return (
		<div className="grid gap-1.5">
			<ol className="grid gap-1.5">
				{config.steps.map((step, index) => {
					const expanded = open === index;
					return (
						<li
							key={index}
							className={cn(
								"rounded-lg border bg-card",
								expanded && "shadow-xs",
							)}
						>
							<div className="flex items-center gap-1.5 py-1 pr-1 pl-2">
								<span className="grid size-5 shrink-0 place-items-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground tabular-nums">
									{index + 1}
								</span>
								<input
									aria-label={`Step ${index + 1} title`}
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
									className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 text-[13px] font-medium outline-none focus-visible:bg-muted pointer-fine:hover:bg-muted"
								/>
								<span className="shrink-0 font-mono text-[11px] text-muted-foreground">
									{step.fields.length
										? `${step.fields.length} field${step.fields.length > 1 ? "s" : ""}`
										: index === last
											? "summary"
											: "content"}
								</span>
								<button
									type="button"
									aria-expanded={expanded}
									aria-label={`${expanded ? "Collapse" : "Edit"} ${step.title}`}
									onClick={() => setOpen(expanded ? null : index)}
									className={ICON_BUTTON}
								>
									<ChevronDown
										aria-hidden
										className={cn(
											"size-4 transition-transform duration-200 ease-out-strong",
											expanded && "rotate-180",
										)}
									/>
								</button>
							</div>

							{expanded ? (
								<div className="grid gap-2 border-t border-dashed p-2">
									<p className="px-0.5 text-[11.5px] text-muted-foreground">
										id{" "}
										<code className="font-mono text-foreground">
											"{names.stepIds[index]}"
										</code>
									</p>
									<input
										aria-label="Step description"
										value={step.description}
										maxLength={LIMITS.description}
										placeholder="Description (optional)"
										onChange={(event) =>
											actions.update((c) =>
												updateStep(c, index, (s) => ({
													...s,
													description: event.target.value,
												})),
											)
										}
										className={INPUT}
									/>

									{step.fields.map((field, j) => (
										<div
											key={j}
											className="grid grid-cols-[minmax(0,1fr)_6.5rem_auto_auto] items-center gap-1"
										>
											<input
												aria-label="Field label"
												title={`name: ${names.fields[index][j]}`}
												value={field.label}
												maxLength={LIMITS.label}
												onChange={(event) =>
													actions.update((c) =>
														updateStep(c, index, (s) =>
															updateField(s, j, { label: event.target.value }),
														),
													)
												}
												className={INPUT}
											/>
											<select
												aria-label="Field type"
												value={field.type}
												onChange={(event) => {
													const type = event.target.value as FieldType;
													actions.update((c) =>
														updateStep(c, index, (s) =>
															updateField(s, j, {
																type,
																options:
																	type === "select"
																		? (field.options ?? [
																				"Option A",
																				"Option B",
																			])
																		: undefined,
															}),
														),
													);
												}}
												className={cn(INPUT, "pr-1")}
											>
												{FIELD_TYPES.map((type) => (
													<option key={type}>{type}</option>
												))}
											</select>
											<button
												type="button"
												aria-pressed={field.required}
												title={field.required ? "Required" : "Optional"}
												onClick={() =>
													actions.update((c) =>
														updateStep(c, index, (s) =>
															updateField(s, j, { required: !field.required }),
														),
													)
												}
												className="pressable h-8 rounded-md border px-1.5 text-[11px] font-semibold text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-transparent aria-pressed:bg-accent aria-pressed:text-accent-foreground"
											>
												req
											</button>
											<button
												type="button"
												aria-label={`Remove ${field.label}`}
												onClick={() =>
													actions.update((c) =>
														updateStep(c, index, (s) => ({
															...s,
															fields: s.fields.filter((_, k) => k !== j),
														})),
													)
												}
												className={ICON_BUTTON}
											>
												<X aria-hidden className="size-3.5" />
											</button>
											{field.type === "select" ? (
												<OptionsInput
													key={(field.options ?? []).join("|")}
													label={field.label}
													options={field.options ?? []}
													onCommit={(options) =>
														actions.update((c) =>
															updateStep(c, index, (s) =>
																updateField(s, j, { options }),
															),
														)
													}
												/>
											) : null}
										</div>
									))}

									<div className="flex items-center gap-1">
										<button
											type="button"
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
											className="pressable mr-auto inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 pointer-fine:hover:bg-muted pointer-fine:hover:text-foreground"
										>
											<Plus aria-hidden className="size-3.5" /> Add field
										</button>
										<button
											type="button"
											aria-label="Move step up"
											disabled={index === 0}
											onClick={() => move(index, index - 1)}
											className={ICON_BUTTON}
										>
											<ChevronUp aria-hidden className="size-4" />
										</button>
										<button
											type="button"
											aria-label="Move step down"
											disabled={index === last}
											onClick={() => move(index, index + 1)}
											className={ICON_BUTTON}
										>
											<ChevronDown aria-hidden className="size-4" />
										</button>
										<button
											type="button"
											aria-label={`Delete ${step.title}`}
											disabled={config.steps.length <= LIMITS.steps.min}
											onClick={() => {
												actions.update((c) => ({
													...c,
													steps: c.steps.filter((_, k) => k !== index),
												}));
												setOpen(null);
												actions.restartPreview();
											}}
											className={cn(
												ICON_BUTTON,
												"pointer-fine:hover:text-destructive",
											)}
										>
											<Trash2 aria-hidden className="size-3.5" />
										</button>
									</div>
								</div>
							) : null}
						</li>
					);
				})}
			</ol>
			<button
				type="button"
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
					setOpen(config.steps.length - 1);
					actions.restartPreview();
				}}
				className="pressable inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 pointer-fine:hover:border-foreground/25 pointer-fine:hover:text-foreground"
			>
				<Plus aria-hidden className="size-3.5" /> Add step
			</button>
		</div>
	);
}

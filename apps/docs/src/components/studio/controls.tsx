"use client";

import type { ReactNode } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

/**
 * Panel building blocks. Each control is an explicit variant (cards, segments,
 * thumbnails, switch rows) instead of one option component with mode flags.
 */

export type Choice<Value extends string> = {
	value: Value;
	label: string;
	hint?: string;
	/** Shown instead of the hint when the choice is unavailable. */
	disabledReason?: string;
};

export function Section({
	title,
	aside,
	children,
	className,
}: {
	title: string;
	aside?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<section
			className={cn("grid gap-3 border-b px-4 py-5 last:border-b-0", className)}
		>
			<div className="flex items-baseline justify-between gap-3">
				<h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
					{title}
				</h2>
				{aside ? (
					<div className="text-xs text-muted-foreground">{aside}</div>
				) : null}
			</div>
			{children}
		</section>
	);
}

const CHOICE =
	"pressable relative rounded-lg border bg-card text-left outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-pressed:border-primary aria-pressed:bg-accent/60 aria-pressed:shadow-[0_0_0_1px_var(--primary)] pointer-fine:hover:not-disabled:not-aria-pressed:border-foreground/20";

/** Stacked cards with a label and a one-line hint. For choices that need explaining. */
export function ChoiceCards<Value extends string>({
	choices,
	value,
	onChange,
	columns = 1,
	label,
}: {
	choices: Choice<Value>[];
	value: Value;
	onChange: (value: Value) => void;
	columns?: 1 | 2;
	label: string;
}) {
	return (
		<fieldset
			aria-label={label}
			className={cn("grid gap-1.5", columns === 2 && "grid-cols-2")}
		>
			{choices.map((choice) => (
				<button
					key={choice.value}
					type="button"
					aria-pressed={choice.value === value}
					disabled={Boolean(choice.disabledReason)}
					onClick={() => onChange(choice.value)}
					className={cn(CHOICE, "grid gap-0.5 px-3 py-2")}
				>
					<span className="text-[13px] font-medium">{choice.label}</span>
					{choice.disabledReason || choice.hint ? (
						<span className="text-xs leading-snug text-muted-foreground">
							{choice.disabledReason ?? choice.hint}
						</span>
					) : null}
				</button>
			))}
		</fieldset>
	);
}

/** A compact row of equal segments. For short, self-explanatory choices. */
export function Segmented<Value extends string>({
	choices,
	value,
	onChange,
	label,
	className,
}: {
	choices: Choice<Value>[];
	value: Value;
	onChange: (value: Value) => void;
	label: string;
	className?: string;
}) {
	return (
		<fieldset
			aria-label={label}
			className={cn("flex gap-0.5 rounded-lg bg-muted p-0.5", className)}
		>
			{choices.map((choice) => (
				<button
					key={choice.value}
					type="button"
					aria-pressed={choice.value === value}
					disabled={Boolean(choice.disabledReason)}
					title={choice.disabledReason ?? choice.hint}
					onClick={() => onChange(choice.value)}
					className="pressable h-7 flex-1 rounded-md px-2 text-xs font-medium whitespace-nowrap text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm pointer-fine:hover:not-aria-pressed:text-foreground"
				>
					{choice.label}
				</button>
			))}
		</fieldset>
	);
}

/** Thumbnails for visual choices, where a picture says more than a label. */
export function ThumbnailPicker<Value extends string>({
	choices,
	value,
	onChange,
	label,
	renderThumbnail,
}: {
	choices: Choice<Value>[];
	value: Value;
	onChange: (value: Value) => void;
	label: string;
	renderThumbnail: (value: Value) => ReactNode;
}) {
	return (
		<fieldset aria-label={label} className="grid grid-cols-3 gap-1.5">
			{choices.map((choice) => (
				<button
					key={choice.value}
					type="button"
					aria-pressed={choice.value === value}
					title={choice.hint}
					onClick={() => onChange(choice.value)}
					className={cn(
						CHOICE,
						"group/thumb grid justify-items-center gap-1.5 px-1.5 pt-2.5 pb-2 text-[11.5px] font-medium text-muted-foreground aria-pressed:text-foreground",
					)}
				>
					<span className="text-muted-foreground/70 group-aria-pressed/thumb:text-primary">
						{renderThumbnail(choice.value)}
					</span>
					{choice.label}
				</button>
			))}
		</fieldset>
	);
}

export function SwitchRow({
	id,
	label,
	description,
	checked,
	onCheckedChange,
	disabledReason,
}: {
	id: string;
	label: string;
	description: ReactNode;
	checked: boolean;
	onCheckedChange: (checked: boolean) => void;
	disabledReason?: string;
}) {
	return (
		<div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 py-1.5">
			<label htmlFor={id} className="text-[13px] font-medium">
				{label}
			</label>
			<Switch
				id={id}
				checked={checked && !disabledReason}
				disabled={Boolean(disabledReason)}
				onCheckedChange={onCheckedChange}
				className="row-span-2"
			/>
			<p className="text-xs leading-snug text-muted-foreground">
				{disabledReason ?? description}
			</p>
		</div>
	);
}

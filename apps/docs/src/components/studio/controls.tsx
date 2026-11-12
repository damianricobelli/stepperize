"use client";

import { Check, Copy } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldLabel,
	FieldTitle,
} from "@/components/ui/field";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

/**
 * Panel building blocks on shadcn/ui. Each control is an explicit variant
 * (choice cards, segments, thumbnails, switch rows) instead of one option
 * component with mode flags.
 */

export type Choice<Value extends string> = {
	value: Value;
	label: string;
	hint?: string;
	/** Shown instead of the hint when the choice is unavailable. */
	disabledReason?: string;
};

/**
 * A titled group inside a panel tab. A plain section with a heading: a
 * fieldset's legend sits on the border box and ignores the padding above it.
 */
export function Section({
	title,
	description,
	aside,
	children,
}: {
	title: string;
	description?: ReactNode;
	aside?: ReactNode;
	children: ReactNode;
}) {
	return (
		<section className="grid gap-3">
			<header className="grid gap-0.5">
				<div className="flex items-center justify-between gap-3">
					<h3 className="text-sm font-medium">{title}</h3>
					{aside ? (
						<span className="text-xs text-muted-foreground">{aside}</span>
					) : null}
				</div>
				{description ? (
					<p className="text-xs text-pretty text-muted-foreground">
						{description}
					</p>
				) : null}
			</header>
			{children}
		</section>
	);
}

/** A labelled sub-group inside a section. */
export function Subsection({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="grid gap-2">
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			{children}
		</div>
	);
}

/** Radio choice cards with a title and a hint. For choices that need explaining. */
export function ChoiceCards<Value extends string>({
	name,
	choices,
	value,
	onChange,
	columns = 1,
	label,
	aside,
}: {
	name: string;
	choices: Choice<Value>[];
	value: Value;
	onChange: (value: Value) => void;
	columns?: 1 | 2;
	label: string;
	/** Extra text on the right of each card title, e.g. an example URL. */
	aside?: (value: Value) => ReactNode;
}) {
	return (
		<RadioGroup
			aria-label={label}
			value={value}
			onValueChange={(next) => onChange(next as Value)}
			className={cn("gap-2", columns === 2 && "grid-cols-2")}
		>
			{choices.map((choice) => {
				const id = `${name}-${choice.value}`;
				const disabled = Boolean(choice.disabledReason);
				return (
					<FieldLabel
						key={choice.value}
						htmlFor={id}
						className="pressable bg-card transition-[scale,border-color,background-color] duration-150 ease-out has-disabled:cursor-not-allowed has-disabled:opacity-55 *:data-[slot=field]:px-3 *:data-[slot=field]:py-2.5"
					>
						<Field orientation="horizontal" data-disabled={disabled}>
							<FieldContent className="min-w-0 gap-0.5">
								<FieldTitle className="w-full justify-between text-[13px]">
									{choice.label}
									{aside ? (
										<code className="truncate font-mono text-[11px] font-normal text-muted-foreground">
											{aside(choice.value)}
										</code>
									) : null}
								</FieldTitle>
								{choice.disabledReason || choice.hint ? (
									<FieldDescription className="text-xs leading-snug">
										{choice.disabledReason ?? choice.hint}
									</FieldDescription>
								) : null}
							</FieldContent>
							<RadioGroupItem
								id={id}
								value={choice.value}
								disabled={disabled}
								// The input border nearly matches a dark card; lift it so the empty circle reads.
								className="dark:border-foreground/30"
							/>
						</Field>
					</FieldLabel>
				);
			})}
		</RadioGroup>
	);
}

/**
 * A segmented control: equal toggles on a muted track, the active one raised.
 * Each segment keeps its own radius, so the group never depends on
 * orientation data attributes for its corners.
 */
export function Segmented<Value extends string>({
	choices,
	value,
	onChange,
	label,
	className,
	itemClassName,
}: {
	choices: (Choice<Value> & { icon?: ReactNode })[];
	value: Value;
	onChange: (value: Value) => void;
	label: string;
	className?: string;
	itemClassName?: string;
}) {
	return (
		<ToggleGroup
			aria-label={label}
			size="sm"
			spacing={0.5}
			value={[value]}
			// Pressing the active segment would empty the group; a choice is always required.
			onValueChange={(next) => {
				if (next[0]) onChange(next[0] as Value);
			}}
			className={cn("w-full rounded-lg bg-muted p-0.5", className)}
		>
			{choices.map((choice) => (
				<ToggleGroupItem
					key={choice.value}
					value={choice.value}
					disabled={Boolean(choice.disabledReason)}
					title={choice.disabledReason ?? choice.hint}
					aria-label={choice.icon ? choice.label : undefined}
					className={cn(
						"h-7 flex-1 rounded-md text-muted-foreground transition-[background-color,color,box-shadow] duration-150 ease-out hover:bg-transparent pointer-fine:hover:text-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm dark:aria-pressed:bg-input/50",
						itemClassName,
					)}
				>
					{choice.icon ?? choice.label}
				</ToggleGroupItem>
			))}
		</ToggleGroup>
	);
}

/** Thumbnail cards for visual choices, where a picture says more than a label. */
export function ThumbnailPicker<Value extends string>({
	name,
	choices,
	value,
	onChange,
	label,
	renderThumbnail,
}: {
	name: string;
	choices: Choice<Value>[];
	value: Value;
	onChange: (value: Value) => void;
	label: string;
	renderThumbnail: (value: Value) => ReactNode;
}) {
	return (
		<RadioGroup
			aria-label={label}
			value={value}
			onValueChange={(next) => onChange(next as Value)}
			className="grid-cols-3 gap-2"
		>
			{choices.map((choice) => {
				const id = `${name}-${choice.value}`;
				return (
					<FieldLabel
						key={choice.value}
						htmlFor={id}
						title={choice.hint}
						className="group/thumb pressable w-full rounded-lg border bg-card p-0 transition-[scale,border-color,background-color] duration-150 ease-out"
					>
						<span className="flex w-full flex-col items-center gap-1.5 px-1.5 pt-2.5 pb-2">
							<RadioGroupItem
								id={id}
								value={choice.value}
								className="sr-only"
							/>
							<span className="text-muted-foreground/70 transition-colors group-has-data-checked/thumb:text-primary">
								{renderThumbnail(choice.value)}
							</span>
							<span className="text-[11.5px] font-medium">{choice.label}</span>
						</span>
					</FieldLabel>
				);
			})}
		</RadioGroup>
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
	const disabled = Boolean(disabledReason);
	return (
		<Field orientation="horizontal" data-disabled={disabled}>
			<FieldContent className="gap-0.5">
				<FieldLabel htmlFor={id} className="text-[13px]">
					{label}
				</FieldLabel>
				<FieldDescription className="text-xs leading-snug">
					{disabledReason ?? description}
				</FieldDescription>
			</FieldContent>
			<Switch
				id={id}
				checked={checked && !disabled}
				disabled={disabled}
				onCheckedChange={onCheckedChange}
			/>
		</Field>
	);
}

/** A shadcn button that copies text and confirms with a check for a moment. */
export function CopyButton({
	value,
	label,
	children,
	variant = "outline",
	size = "sm",
	className,
}: {
	value: string;
	/** Accessible label, e.g. "Copy install command". */
	label: string;
	children?: ReactNode;
	variant?: "default" | "outline" | "ghost" | "secondary";
	size?: "sm" | "xs" | "icon-sm" | "icon-xs";
	className?: string;
}) {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	async function copy() {
		try {
			await navigator.clipboard.writeText(value);
			setCopied(true);
			if (timer.current) clearTimeout(timer.current);
			timer.current = setTimeout(() => setCopied(false), 1600);
		} catch {
			// Clipboard can be unavailable (permissions, insecure context).
		}
	}

	return (
		<Button
			type="button"
			variant={variant}
			size={size}
			aria-label={label}
			onClick={copy}
			className={className}
		>
			{copied ? (
				<Check aria-hidden data-icon="inline-start" />
			) : (
				<Copy aria-hidden data-icon="inline-start" />
			)}
			{children}
			<span className="sr-only" role="status">
				{copied ? "Copied" : ""}
			</span>
		</Button>
	);
}

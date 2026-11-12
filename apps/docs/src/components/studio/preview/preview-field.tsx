"use client";

import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Field,
	FieldContent,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	InputOTP,
	InputOTPGroup,
	InputOTPSlot,
} from "@/components/ui/input-otp";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { StudioField, UiKit } from "@/lib/studio/config";
import {
	FIELD_KINDS,
	fieldSpec,
	OTP_LENGTH,
	sliderRange,
} from "@/lib/studio/fields";
import { cn } from "@/lib/utils";
import { DatePicker } from "../kit/date-picker";

/**
 * One preview field, rendered the way the generated native form renders it:
 * named, uncontrolled controls read back from FormData. With the shadcn kit
 * these are the real components the generated code imports; Base UI controls
 * submit through hidden inputs, so FormData sees them like native ones.
 */

const TW_INPUT =
	"h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition-[border-color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive";
const TW_SWITCH =
	"relative h-5 w-9 shrink-0 cursor-pointer appearance-none rounded-full bg-input transition-colors duration-200 before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-background before:shadow-sm before:transition-transform before:duration-200 checked:bg-primary checked:before:translate-x-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";

/** Reads a field back from FormData exactly like the generated native form. */
export function readField(
	field: StudioField,
	key: string,
	formData: FormData,
): unknown {
	const spec = fieldSpec(field);
	const raw = formData.get(key);
	switch (spec.kind) {
		case "boolean":
			return formData.has(key);
		case "multi":
			return formData.getAll(key).map(String);
		case "number":
			if (field.type === "slider") return Number(raw);
			return spec.required
				? Number(raw || Number.NaN)
				: raw
					? Number(raw)
					: undefined;
		default:
			return String(raw ?? "");
	}
}

type PreviewFieldProps = {
	field: StudioField;
	name: string;
	defaultValue: unknown;
	error: string | undefined;
	ui: UiKit;
};

function Label({ field, ui }: { field: StudioField; ui: UiKit }) {
	const spec = fieldSpec(field);
	return (
		<>
			{field.label}
			{!spec.required && spec.kind !== "boolean" ? (
				<span
					className={cn(
						ui !== "unstyled" && "font-normal text-muted-foreground",
					)}
				>
					{" "}
					(optional)
				</span>
			) : null}
		</>
	);
}

export function PreviewField(props: PreviewFieldProps) {
	return props.ui === "shadcn" ? (
		<ShadcnField {...props} />
	) : (
		<NativeField {...props} />
	);
}

// ─── shadcn/ui ───────────────────────────────────────────────────────────────

function ShadcnControl({
	field,
	name,
	defaultValue,
	error,
	id,
}: PreviewFieldProps & { id: string }) {
	const invalid = error ? true : undefined;
	const options = field.options ?? [];
	const text = typeof defaultValue === "string" ? defaultValue : undefined;
	const kind = FIELD_KINDS[field.type];
	switch (field.type) {
		case "textarea":
			return (
				<Textarea
					id={id}
					name={name}
					defaultValue={text}
					aria-invalid={invalid}
				/>
			);
		case "date":
			return (
				<DatePicker
					id={id}
					name={name}
					defaultValue={text}
					aria-invalid={invalid}
				/>
			);
		case "otp":
			return (
				<InputOTP
					id={id}
					name={name}
					maxLength={OTP_LENGTH}
					defaultValue={text}
					aria-invalid={invalid}
				>
					<InputOTPGroup>
						{Array.from({ length: OTP_LENGTH }, (_, index) => (
							<InputOTPSlot key={index} index={index} />
						))}
					</InputOTPGroup>
				</InputOTP>
			);
		case "slider": {
			const { min, max } = sliderRange(field);
			return (
				<Slider
					id={id}
					name={name}
					min={min}
					max={max}
					defaultValue={[typeof defaultValue === "number" ? defaultValue : min]}
					aria-invalid={invalid}
				/>
			);
		}
		case "select":
			return (
				<Select name={name} defaultValue={text || null}>
					<SelectTrigger id={id} aria-invalid={invalid} className="w-full">
						<SelectValue placeholder="Select…" />
					</SelectTrigger>
					<SelectContent>
						{options.map((option) => (
							<SelectItem key={option} value={option}>
								{option}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			);
		case "radio":
			return (
				<RadioGroup name={name} defaultValue={text} aria-invalid={invalid}>
					{options.map((option, index) => (
						<Field key={option} orientation="horizontal">
							<RadioGroupItem id={`${id}-${index}`} value={option} />
							<FieldLabel htmlFor={`${id}-${index}`} className="font-normal">
								{option}
							</FieldLabel>
						</Field>
					))}
				</RadioGroup>
			);
		case "checkboxes":
			return (
				<FieldGroup data-slot="checkbox-group" className="gap-3">
					{options.map((option, index) => (
						<Field key={option} orientation="horizontal">
							<Checkbox
								id={`${id}-${index}`}
								name={name}
								value={option}
								defaultChecked={
									Array.isArray(defaultValue) && defaultValue.includes(option)
								}
							/>
							<FieldLabel htmlFor={`${id}-${index}`} className="font-normal">
								{option}
							</FieldLabel>
						</Field>
					))}
				</FieldGroup>
			);
		case "checkbox":
			return (
				<Checkbox
					id={id}
					name={name}
					defaultChecked={defaultValue === true}
					aria-invalid={invalid}
				/>
			);
		case "switch":
			return (
				<Switch
					id={id}
					name={name}
					defaultChecked={defaultValue === true}
					aria-invalid={invalid}
				/>
			);
		default:
			return (
				<Input
					id={id}
					name={name}
					type={kind.input}
					defaultValue={typeof defaultValue === "number" ? defaultValue : text}
					aria-invalid={invalid}
				/>
			);
	}
}

function ShadcnField(props: PreviewFieldProps) {
	const { field, name, error } = props;
	const id = `preview-${name}`;
	const kind = FIELD_KINDS[field.type];
	const control = <ShadcnControl {...props} id={id} />;
	const wide = kind.wide && "@md:col-span-2";

	if (kind.fieldset) {
		return (
			<FieldSet className={cn(wide)}>
				<FieldLegend variant="label">
					<Label field={field} ui="shadcn" />
				</FieldLegend>
				{control}
				<FieldError>{error}</FieldError>
			</FieldSet>
		);
	}
	if (field.type === "checkbox" || field.type === "switch") {
		return (
			<Field orientation="horizontal" className={cn(wide)}>
				{control}
				<FieldContent>
					<FieldLabel htmlFor={id}>
						<Label field={field} ui="shadcn" />
					</FieldLabel>
					<FieldError>{error}</FieldError>
				</FieldContent>
			</Field>
		);
	}
	return (
		<Field className={cn(wide)}>
			<FieldLabel htmlFor={id}>
				<Label field={field} ui="shadcn" />
			</FieldLabel>
			{control}
			{field.type === "slider" ? <RangeHint field={field} ui="shadcn" /> : null}
			<FieldError>{error}</FieldError>
		</Field>
	);
}

function RangeHint({ field, ui }: { field: StudioField; ui: UiKit }) {
	if (ui === "unstyled") return null;
	const { min, max } = sliderRange(field);
	return (
		<div className="flex justify-between text-xs text-muted-foreground tabular-nums">
			<span>{min}</span>
			<span>{max}</span>
		</div>
	);
}

// ─── Tailwind and unstyled: native elements ──────────────────────────────────

function NativeControl({
	field,
	name,
	defaultValue,
	error,
	ui,
	id,
}: PreviewFieldProps & { id: string }) {
	const raw = ui === "unstyled";
	const c = (classes: string) => (raw ? undefined : classes);
	const common = { id, name, "aria-invalid": error ? true : undefined };
	const options = field.options ?? [];
	const text = typeof defaultValue === "string" ? defaultValue : undefined;
	const kind = FIELD_KINDS[field.type];
	switch (field.type) {
		case "textarea":
			return (
				<textarea
					{...common}
					defaultValue={text}
					className={c(cn(TW_INPUT, "min-h-20 py-2"))}
				/>
			);
		case "otp":
			return (
				<input
					{...common}
					inputMode="numeric"
					autoComplete="one-time-code"
					maxLength={OTP_LENGTH}
					defaultValue={text}
					className={c(cn(TW_INPUT, "font-mono tracking-[0.4em]"))}
				/>
			);
		case "slider": {
			const { min, max } = sliderRange(field);
			return (
				<input
					{...common}
					type="range"
					min={min}
					max={max}
					defaultValue={typeof defaultValue === "number" ? defaultValue : min}
					className={c("w-full accent-primary")}
				/>
			);
		}
		case "select":
			return (
				<select {...common} defaultValue={text ?? ""} className={c(TW_INPUT)}>
					<option value="">Select…</option>
					{options.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
			);
		case "radio":
		case "checkboxes":
			return (
				<div className={c("grid gap-2")}>
					{options.map((option, index) => (
						<label
							key={option}
							className={c("flex items-center gap-2 text-sm")}
						>
							<input
								id={`${id}-${index}`}
								name={name}
								type={field.type === "radio" ? "radio" : "checkbox"}
								value={option}
								defaultChecked={
									field.type === "radio"
										? text === option
										: Array.isArray(defaultValue) &&
											defaultValue.includes(option)
								}
								className={c("size-4 accent-primary")}
							/>
							{option}
						</label>
					))}
				</div>
			);
		case "checkbox":
		case "switch":
			return (
				<input
					{...common}
					type="checkbox"
					role={field.type === "switch" ? "switch" : undefined}
					defaultChecked={defaultValue === true}
					className={c(
						field.type === "switch" ? TW_SWITCH : "size-4 accent-primary",
					)}
				/>
			);
		default:
			return (
				<input
					{...common}
					type={kind.input}
					defaultValue={typeof defaultValue === "number" ? defaultValue : text}
					className={c(TW_INPUT)}
				/>
			);
	}
}

function NativeField(props: PreviewFieldProps) {
	const { field, name, error, ui } = props;
	const raw = ui === "unstyled";
	const id = `preview-${name}`;
	const kind = FIELD_KINDS[field.type];
	const control = <NativeControl {...props} id={id} />;
	const wide = !raw && kind.wide && "@md:col-span-2";
	const message: ReactNode = error ? (
		<p
			role="alert"
			className={cn(!raw && "basis-full text-sm text-destructive")}
		>
			{error}
		</p>
	) : null;

	if (kind.fieldset) {
		return (
			<fieldset className={cn(!raw && "grid gap-2", wide, raw && "my-2")}>
				<legend className={cn(!raw && "mb-1 text-sm font-medium")}>
					<Label field={field} ui={ui} />
				</legend>
				{control}
				{message}
			</fieldset>
		);
	}
	const label = (
		<label
			htmlFor={id}
			className={cn(!raw && "text-sm font-medium", raw && "mr-2")}
		>
			<Label field={field} ui={ui} />
		</label>
	);
	if (field.type === "checkbox" || field.type === "switch") {
		return (
			<div
				className={cn(
					!raw && "flex flex-wrap items-center gap-2",
					wide,
					raw && "my-2 block",
				)}
			>
				{control}
				{label}
				{message}
			</div>
		);
	}
	return (
		<div className={cn(!raw && "grid gap-2", wide, raw && "my-2 block")}>
			{label}
			{control}
			{field.type === "slider" ? <RangeHint field={field} ui={ui} /> : null}
			{message}
		</div>
	);
}

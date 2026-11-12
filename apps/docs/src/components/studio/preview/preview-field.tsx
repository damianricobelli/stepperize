"use client";

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
import type { StudioField } from "@/lib/studio/config";
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
 * named, uncontrolled controls read back from FormData. They are the same
 * shadcn/ui components the generated code imports; Base UI controls submit
 * through hidden inputs, so FormData sees them like native ones.
 */

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
};

function Label({ field }: { field: StudioField }) {
	const spec = fieldSpec(field);
	return (
		<>
			{field.label}
			{!spec.required && spec.kind !== "boolean" ? (
				<span className="font-normal text-muted-foreground"> (optional)</span>
			) : null}
		</>
	);
}

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

export function PreviewField(props: PreviewFieldProps) {
	const { field, name, error } = props;
	const id = `preview-${name}`;
	const kind = FIELD_KINDS[field.type];
	const control = <ShadcnControl {...props} id={id} />;
	const wide = kind.wide && "@md:col-span-2";

	if (kind.fieldset) {
		return (
			<FieldSet className={cn(wide)}>
				<FieldLegend variant="label">
					<Label field={field} />
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
						<Label field={field} />
					</FieldLabel>
					<FieldError>{error}</FieldError>
				</FieldContent>
			</Field>
		);
	}
	return (
		<Field className={cn(wide)}>
			<FieldLabel htmlFor={id}>
				<Label field={field} />
			</FieldLabel>
			{control}
			{field.type === "slider" ? <RangeHint field={field} /> : null}
			<FieldError>{error}</FieldError>
		</Field>
	);
}

function RangeHint({ field }: { field: StudioField }) {
	const { min, max } = sliderRange(field);
	return (
		<div className="flex justify-between text-xs text-muted-foreground tabular-nums">
			<span>{min}</span>
			<span>{max}</span>
		</div>
	);
}

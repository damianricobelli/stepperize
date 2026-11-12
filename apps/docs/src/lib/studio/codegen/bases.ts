import type { Base } from "../config";

/**
 * shadcn/ui components look the same on every base, but their props follow
 * the primitives underneath: Radix and Base UI use `checked`/`onCheckedChange`
 * and `aria-invalid`; React Aria uses `isSelected`/`onChange` and `isInvalid`.
 *
 * A form library says *what* a control binds to (a {@link Binding}); a
 * {@link Kit} says how the project's components spell it.
 */

/** A value read and written through a form library's state. */
export type ControlledBinding = {
	controlled: true;
	/** Expression for the current value; may be undefined. */
	get: string;
	/** Statement that stores `expr`; `kind` lets a library cast at the edge. */
	set: (expr: string, kind: ValueKind) => string;
	/** `get` is never undefined, so no fallback is needed. */
	defined?: boolean;
};

/** A named, uncontrolled control whose value the browser submits. */
export type NamedBinding = {
	controlled: false;
	/** `name` attribute value, including braces or quotes. */
	name: string;
	/** Initial values, as expressions, by the shape of the control. */
	checked: string;
	/** Whether `option` starts checked; `option` is in scope. */
	multi: string;
	/** Initial choice; may be undefined. */
	choice: string;
	/** Initial slider value, a number. */
	slider: string;
	/** Initial text value, a string. */
	text: string;
};

export type Binding = ControlledBinding | NamedBinding;

/** Components with their own value, bound with a value and a change callback (or a name + default). */
export type ValueKind =
	| "checked"
	| "multi"
	| "choice"
	| "slider"
	| "otp"
	| "date";

/** Value components that can report an invalid state. */
export type InvalidTarget =
	| "checkbox"
	| "switch"
	| "radio"
	| "select"
	| "slider"
	| "otp"
	| "date";

export type Kit = {
	base: Base;
	/** Props binding a checkbox or switch to a boolean. */
	checked: (b: Binding) => string;
	/** Props binding one checkbox of a group; `option` is in scope. */
	multi: (b: Binding) => string;
	/** Props binding a select or radio group to one option. */
	choice: (b: Binding) => string;
	/** Range and value props for a slider. */
	slider: (b: Binding, range: { min: number; max: number }) => string;
	/** The invalid-state attribute for a value component, or "". */
	invalid: (target: InvalidTarget, expr: string | null) => string;
	/** A select's markup around its items. */
	select: (parts: {
		id: string;
		value: string;
		invalid: string | null;
		items: string;
	}) => string[];
	/** `option` is in scope. */
	selectItem: string;
	/** Attributes for a button: disabled state and click handler. */
	button: (attrs: { disabled?: string; onClick?: string }) => string;
};

const attr = (name: string, expr: string) => ` ${name}={${expr}}`;

const multiNext = (get: string) =>
	`checked ? [...(${get} ?? []), option] : (${get} ?? []).filter((value) => value !== option)`;

const domButton = ({
	disabled,
	onClick,
}: {
	disabled?: string;
	onClick?: string;
}) =>
	`${disabled ? ` disabled={${disabled}}` : ""}${onClick ? ` onClick={${onClick}}` : ""}`;

const SELECT_PLACEHOLDER = "Select…";

/** Radix UI and Base UI share most props; these are the differences. */
function domKit(base: "radix" | "base"): Kit {
	const radix = base === "radix";
	return {
		base,
		checked: (b) =>
			b.controlled
				? `checked={${b.get} ?? false} onCheckedChange={(checked) => ${b.set(radix ? "checked === true" : "checked", "checked")}}`
				: `name=${b.name} defaultChecked={${b.checked}}`,
		multi: (b) =>
			b.controlled
				? `checked={${b.get}?.includes(option) ?? false} onCheckedChange={(checked) => ${b.set(multiNext(b.get), "multi")}}`
				: `name=${b.name} value={option} defaultChecked={${b.multi}}`,
		// Radix clears a select with "", Base UI with null.
		choice: (b) =>
			b.controlled
				? `value={${b.get} ?? ${radix ? '""' : "null"}} onValueChange={(value) => ${b.set("value", "choice")}}`
				: `name=${b.name} defaultValue={${b.choice}${radix ? "" : " ?? null"}}`,
		slider: (b, { min, max }) =>
			`min={${min}} max={${max}} ${
				b.controlled
					? `value={[${b.get} ?? ${min}]} onValueChange={(value) => ${b.set(radix ? `value[0] ?? ${min}` : "Array.isArray(value) ? value[0] : value", "slider")}}`
					: `name=${b.name} defaultValue={[${b.slider}]}`
			}`,
		invalid: (_, expr) => (expr ? attr("aria-invalid", expr) : ""),
		select: ({ id, value, invalid, items }) => [
			`<Select ${value}>`,
			`\t<SelectTrigger id=${id}${invalid ? attr("aria-invalid", invalid) : ""} className="w-full">`,
			`\t\t<SelectValue placeholder="${SELECT_PLACEHOLDER}" />`,
			"\t</SelectTrigger>",
			// The popup layout: a list under the trigger, not over it.
			radix
				? '\t<SelectContent position="popper">'
				: "\t<SelectContent alignItemWithTrigger={false}>",
			items,
			"\t</SelectContent>",
			"</Select>",
		],
		selectItem:
			"<SelectItem key={option} value={option}>\n\t{option}\n</SelectItem>",
		button: domButton,
	};
}

/** React Aria Components: `isSelected`, `onChange`, `isInvalid`, `onPress`. */
const ariaKit: Kit = {
	base: "aria",
	checked: (b) =>
		b.controlled
			? `isSelected={${b.get} ?? false} onChange={(selected) => ${b.set("selected", "checked")}}`
			: `name=${b.name} defaultSelected={${b.checked}}`,
	multi: (b) =>
		b.controlled
			? `isSelected={${b.get}?.includes(option) ?? false} onChange={(checked) => ${b.set(multiNext(b.get), "multi")}}`
			: `name=${b.name} value={option} defaultSelected={${b.multi}}`,
	choice: (b) =>
		b.controlled
			? `value={${b.get} ?? null} onChange={(value) => ${b.set("value", "choice")}}`
			: `name=${b.name} defaultValue={${b.choice} ?? null}`,
	// React Aria sliders take a number. Their thumbs take no `name`, so
	// uncontrolled forms bind them to state and a hidden input (see forms.ts).
	slider: (b, { min, max }) =>
		`minValue={${min}} maxValue={${max}} ${
			b.controlled
				? `value={${b.defined ? b.get : `${b.get} ?? ${min}`}} onChange={(value) => ${b.set("value", "slider")}}`
				: `defaultValue={${b.slider}}`
		}`,
	invalid: (target, expr) => {
		// React Aria's Switch and Slider have no invalid state; FieldError still shows the message.
		if (!expr || target === "slider" || target === "switch") return "";
		return target === "otp" || target === "date"
			? attr("aria-invalid", expr)
			: attr("isInvalid", expr);
	},
	select: ({ id, value, invalid, items }) => [
		`<Select ${value} placeholder="${SELECT_PLACEHOLDER}"${invalid ? attr("isInvalid", invalid) : ""} className="w-full">`,
		`\t<SelectTrigger id=${id}>`,
		"\t\t<SelectValue />",
		"\t</SelectTrigger>",
		"\t<SelectContent>",
		items,
		"\t</SelectContent>",
		"</Select>",
	],
	selectItem:
		"<SelectItem key={option} id={option}>\n\t{option}\n</SelectItem>",
	button: ({ disabled, onClick }) =>
		`${disabled ? ` isDisabled={${disabled}}` : ""}${onClick ? ` onPress={${onClick}}` : ""}`,
};

export const KITS: Record<Base, Kit> = {
	radix: domKit("radix"),
	base: domKit("base"),
	aria: ariaKit,
};

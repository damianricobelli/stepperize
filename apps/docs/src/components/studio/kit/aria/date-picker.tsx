"use client";

import {
	type CalendarDate,
	getLocalTimeZone,
	parseDate,
	today,
} from "@internationalized/date";
import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger } from "@/components/ui/popover";

/** Parses `YYYY-MM-DD`, what `<input type="date">` and the schemas use. */
function fromISODate(value: string): CalendarDate | undefined {
	try {
		return value ? parseDate(value) : undefined;
	} catch {
		return undefined;
	}
}

const MIN_DATE = parseDate("1900-01-01");
const MAX_DATE = today(getLocalTimeZone()).add({ years: 10 });

type DatePickerProps = {
	id?: string;
	/** Renders a hidden input, so native forms and Conform read the value. */
	name?: string;
	value?: string;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	"aria-invalid"?: boolean;
};

/** A shadcn/ui date picker whose value is an ISO date string. */
export function DatePicker({
	id,
	name,
	value,
	defaultValue = "",
	onValueChange,
	placeholder = "Pick a date",
	"aria-invalid": invalid,
}: DatePickerProps) {
	const [open, setOpen] = useState(false);
	const [uncontrolled, setUncontrolled] = useState(defaultValue);
	const current = value ?? uncontrolled;
	const selected = fromISODate(current);

	return (
		<>
			<PopoverTrigger isOpen={open} onOpenChange={setOpen}>
				<Button
					id={id}
					variant="outline"
					aria-invalid={invalid}
					data-empty={!selected}
					className="w-full justify-between font-normal data-[empty=true]:text-muted-foreground"
				>
					{selected
						? selected
								.toDate(getLocalTimeZone())
								.toLocaleDateString(undefined, { dateStyle: "medium" })
						: placeholder}
					<CalendarIcon aria-hidden />
				</Button>
				<Popover className="w-auto p-0" placement="bottom start">
					<Calendar
						aria-label="Date"
						value={selected ?? null}
						captionLayout="dropdown"
						minValue={MIN_DATE}
						maxValue={MAX_DATE}
						onChange={(date) => {
							const next = date.toString();
							setUncontrolled(next);
							onValueChange?.(next);
							setOpen(false);
						}}
					/>
				</Popover>
			</PopoverTrigger>
			{name ? <input type="hidden" name={name} value={current} /> : null}
		</>
	);
}

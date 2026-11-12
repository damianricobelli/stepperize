"use client";

import { CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

/** `YYYY-MM-DD` in local time: what `<input type="date">` and the schemas use. */
function toISODate(date: Date): string {
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${date.getFullYear()}-${month}-${day}`;
}

function fromISODate(value: string): Date | undefined {
	const [year, month, day] = value.split("-").map(Number);
	return year && month && day ? new Date(year, month - 1, day) : undefined;
}

const START_MONTH = new Date(1900, 0);
const END_MONTH = new Date(new Date().getFullYear() + 10, 11);

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
	const selected = current ? fromISODate(current) : undefined;

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					id={id}
					type="button"
					variant="outline"
					aria-invalid={invalid}
					data-empty={!selected}
					className="w-full justify-between font-normal data-[empty=true]:text-muted-foreground"
				>
					{selected
						? selected.toLocaleDateString(undefined, { dateStyle: "medium" })
						: placeholder}
					<CalendarIcon aria-hidden />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto overflow-hidden p-0" align="start">
				<Calendar
					mode="single"
					selected={selected}
					defaultMonth={selected}
					captionLayout="dropdown"
					startMonth={START_MONTH}
					endMonth={END_MONTH}
					onSelect={(date) => {
						const next = date ? toISODate(date) : "";
						setUncontrolled(next);
						onValueChange?.(next);
						setOpen(false);
					}}
				/>
			</PopoverContent>
			{name ? <input type="hidden" name={name} value={current} /> : null}
		</Popover>
	);
}

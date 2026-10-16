"use client";

import { defineStepper } from "@stepperize/react";

const signup = defineStepper([
	{ id: "name", title: "Name" },
	{ id: "email", title: "Email" },
	{ id: "confirm", title: "Confirm" },
]);

/* Styling only. Stepperize does not depend on any of these classes. */
const button =
	"inline-flex h-9 items-center justify-center rounded-lg border bg-background px-4 text-sm font-medium shadow-xs transition-[background-color,transform] duration-150 hover:bg-muted active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const primaryButton =
	"inline-flex h-9 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40";
const input =
	"h-10 w-full rounded-lg border bg-background px-3 text-sm shadow-xs outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:ring-3 focus:ring-primary/15";

export function Signup() {
	const stepper = signup.useStepper();

	return (
		<form
			className="mx-auto w-full max-w-md space-y-5 rounded-xl border bg-background p-5 shadow-sm"
			onSubmit={(event) => event.preventDefault()}
		>
			<div className="space-y-3">
				<p className="text-sm text-muted-foreground">
					Step {stepper.index + 1} of {stepper.count}:{" "}
					<span className="font-medium text-foreground">
						{stepper.current.title}
					</span>
				</p>
				{/* Steps reached out of the total, from index and count. */}
				<div className="h-1.5 overflow-hidden rounded-full bg-muted">
					<div
						className="h-full origin-left rounded-full bg-primary transition-transform duration-300"
						style={{
							transform: `scaleX(${(stepper.index + 1) / stepper.count})`,
						}}
					/>
				</div>
			</div>

			<div className="min-h-[4.5rem]">
				{stepper.match({
					name: () => (
						<label className="grid gap-1.5">
							<span className="text-[13px] font-medium">Name</span>
							<input name="name" placeholder="Ada Lovelace" className={input} />
						</label>
					),
					email: () => (
						<label className="grid gap-1.5">
							<span className="text-[13px] font-medium">Email</span>
							<input
								name="email"
								type="email"
								placeholder="ada@example.com"
								className={input}
							/>
						</label>
					),
					confirm: () => (
						<p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
							Review your details.
						</p>
					),
				})}
			</div>

			<div className="flex justify-between gap-2">
				<button
					type="button"
					className={button}
					disabled={!stepper.canPrev}
					onClick={() => stepper.prev()}
				>
					Back
				</button>
				<button
					type="button"
					className={primaryButton}
					disabled={!stepper.canNext}
					onClick={() => stepper.next()}
				>
					Next
				</button>
			</div>
		</form>
	);
}

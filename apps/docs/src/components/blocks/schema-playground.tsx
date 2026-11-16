import { defineStepper } from "@stepperize/react";
import { type } from "arktype";
import { CheckCircle2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import * as v from "valibot";
import { z } from "zod";

/**
 * Shared result panel. Each demo below owns its own `defineStepper` and only
 * passes the outcome of `next()` here for rendering — the validation logic
 * stays per-library, this is just presentation.
 */
type ValidationResult =
	| { success: true; data: unknown }
	| {
			success: false;
			issues: ReadonlyArray<{ message: string }>;
	  };

/**
 * `next(data)` validates the step against its schema and resolves with what
 * happened. A throwaway flow from `definition.create()` runs it without React.
 */
async function check(
	form: {
		create: () => {
			next: (
				data: unknown,
			) => Promise<
				| { accepted: true; data: { user?: unknown } }
				| { accepted: false; issues?: ReadonlyArray<{ message: string }> }
			>;
		};
	},
	value: unknown,
): Promise<ValidationResult> {
	const result = await form.create().next(value);
	return result.accepted
		? { success: true, data: result.data.user }
		: { success: false, issues: result.issues ?? [] };
}

function Demo({
	title,
	field,
	value,
	onChange,
	placeholder,
	result,
}: {
	title: string;
	field: string;
	value: string;
	onChange: (v: string) => void;
	placeholder: string;
	result: ValidationResult | null;
}) {
	return (
		<div className="w-full max-w-md rounded-xl border bg-background p-6 shadow-sm">
			<p className="mb-3 text-sm font-semibold">{title}</p>
			<label className="block space-y-1.5">
				<span className="text-xs font-medium text-muted-foreground">
					{field}
				</span>
				<input
					value={value}
					onChange={(e) => onChange(e.target.value)}
					placeholder={placeholder}
					className="w-full rounded-lg border bg-muted/30 px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
				/>
			</label>
			<div className="mt-4 rounded-lg border bg-muted/30 p-3 text-sm">
				{result?.success ? (
					<div className="space-y-2">
						<div className="flex items-center gap-2 font-medium text-chart-2">
							<CheckCircle2 className="size-4" /> success
						</div>
						<pre className="overflow-x-auto text-xs text-muted-foreground">
							{JSON.stringify(result.data, null, 2)}
						</pre>
					</div>
				) : result && !result.success ? (
					<ul className="space-y-1 text-xs">
						{result.issues.map((issue, i) => (
							<li
								key={`${issue.message}-${i}`}
								className="flex items-center gap-2 font-medium text-destructive"
							>
								<XCircle className="size-4 shrink-0" /> {issue.message}
							</li>
						))}
					</ul>
				) : (
					<span className="text-xs text-muted-foreground">…</span>
				)}
			</div>
		</div>
	);
}

// ---------------------------------------------------------------------------
// Zod — `.min()` on a string
// ---------------------------------------------------------------------------
const zodForm = defineStepper([
	{
		id: "user",
		schema: z.object({ username: z.string().min(3, "At least 3 characters") }),
	},
]);

export function SchemaZodBlock() {
	const [username, setUsername] = useState("ab");
	const [result, setResult] = useState<ValidationResult | null>(null);

	// Re-validate whenever the value changes — and once on mount, so the result
	// reflects the initial value instead of waiting for the first keystroke.
	useEffect(() => {
		check(zodForm, { username }).then(setResult);
	}, [username]);

	return (
		<Demo
			title="Zod"
			field="Username"
			value={username}
			onChange={setUsername}
			placeholder="ada"
			result={result}
		/>
	);
}

// ---------------------------------------------------------------------------
// Valibot — `pipe(string(), email())`
// ---------------------------------------------------------------------------
const valibotForm = defineStepper([
	{
		id: "user",
		schema: v.object({
			email: v.pipe(v.string(), v.email("Enter a valid email")),
		}),
	},
]);

export function SchemaValibotBlock() {
	const [email, setEmail] = useState("ada@");
	const [result, setResult] = useState<ValidationResult | null>(null);

	useEffect(() => {
		check(valibotForm, { email }).then(setResult);
	}, [email]);

	return (
		<Demo
			title="Valibot"
			field="Email"
			value={email}
			onChange={setEmail}
			placeholder="ada@lovelace.dev"
			result={result}
		/>
	);
}

// ---------------------------------------------------------------------------
// ArkType — an embedded regex string
// ---------------------------------------------------------------------------
const arktypeForm = defineStepper([
	{
		id: "user",
		schema: type({ code: "/^[A-Z]{3}$/" }),
	},
]);

export function SchemaArktypeBlock() {
	const [code, setCode] = useState("ab");
	const [result, setResult] = useState<ValidationResult | null>(null);

	useEffect(() => {
		check(arktypeForm, { code }).then(setResult);
	}, [code]);

	return (
		<Demo
			title="ArkType"
			field="Code (3 uppercase letters)"
			value={code}
			onChange={setCode}
			placeholder="ABC"
			result={result}
		/>
	);
}

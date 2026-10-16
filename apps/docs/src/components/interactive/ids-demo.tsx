"use client";

import { defineStepper } from "@stepperize/react";
import { useMemo, useState } from "react";

/* Styling only. Stepperize does not depend on any of these classes. */
const input =
	"h-9 w-full rounded-lg border bg-background px-3 font-mono text-[13px] shadow-xs outline-none transition-[border-color,box-shadow] duration-150 focus:border-primary/60 focus:ring-3 focus:ring-primary/15";
const eyebrow =
	"text-[11px] font-medium uppercase tracking-wider text-muted-foreground";

/** Edit distance, for a "did you mean" hint on typos. */
function distance(a: string, b: string) {
	const row = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		let previous = row[0];
		row[0] = i;
		for (let j = 1; j <= b.length; j++) {
			const current = row[j];
			row[j] = Math.min(
				row[j] + 1,
				row[j - 1] + 1,
				previous + (a[i - 1] === b[j - 1] ? 0 : 1),
			);
			previous = current;
		}
	}
	return row[b.length];
}

/**
 * Edit the step list, then probe an id. The verdict comes from the real
 * `parseStep` of a definition built from your ids: the runtime twin of the
 * compile-time check TypeScript runs on `goTo`.
 */
export function IdsDemo() {
	const [ids, setIds] = useState(["shipping", "payment", "review"]);
	const [draft, setDraft] = useState("");
	const [probe, setProbe] = useState("paymnt");

	const flow = useMemo(() => defineStepper(ids.map((id) => ({ id }))), [ids]);
	const parsed = flow.parseStep(probe);
	const suggestion = parsed
		? undefined
		: ids
				.map((id) => ({ id, d: distance(probe, id) }))
				.filter(({ d }) => d > 0 && d <= 2)
				.sort((a, b) => a.d - b.d)[0]?.id;

	const candidate = draft.trim();
	const duplicate = ids.includes(candidate);
	const looksUnstable = /\s|^\d/.test(candidate);

	function add() {
		if (!candidate || duplicate) return;
		setIds((current) => [...current, candidate]);
		setDraft("");
	}

	return (
		<section aria-label="Step id explorer" className="space-y-5">
			<div className="grid gap-4 md:grid-cols-2">
				<div className="overflow-hidden rounded-xl border bg-background">
					<p className={`${eyebrow} border-b px-3 py-2`}>Your definition</p>
					<div className="p-3 font-mono text-[12.5px] leading-7">
						<p>
							<span className="text-violet-600 dark:text-violet-300">
								const
							</span>{" "}
							checkout ={" "}
							<span className="text-sky-700 dark:text-sky-300">
								defineStepper
							</span>
							([
						</p>
						<ul>
							{ids.map((id) => (
								<li
									key={id}
									className="group flex items-center justify-between gap-2 pl-4"
								>
									<span>
										{"{ "}id:{" "}
										<span className="text-emerald-700 dark:text-emerald-300">
											"{id}"
										</span>
										{" },"}
									</span>
									<button
										type="button"
										aria-label={`Remove ${id}`}
										disabled={ids.length === 1}
										onClick={() =>
											setIds((current) => current.filter((x) => x !== id))
										}
										className="grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
									>
										<svg
											viewBox="0 0 16 16"
											className="block size-3.5"
											aria-hidden
										>
											<path
												d="M5 5l6 6M11 5l-6 6"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
											/>
										</svg>
									</button>
								</li>
							))}
						</ul>
						<p>]);</p>
					</div>
					<form
						className="flex gap-2 border-t p-3"
						onSubmit={(event) => {
							event.preventDefault();
							add();
						}}
					>
						<label className="sr-only" htmlFor="ids-new">
							New step id
						</label>
						<input
							id="ids-new"
							className={input}
							placeholder="add an id, e.g. gift-note"
							value={draft}
							autoCapitalize="none"
							autoCorrect="off"
							spellCheck={false}
							onChange={(event) => setDraft(event.target.value)}
						/>
						<button
							type="submit"
							disabled={!candidate || duplicate}
							className="inline-flex h-9 shrink-0 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-[background-color,transform] duration-150 hover:bg-primary/90 active:scale-[0.97] disabled:opacity-40"
						>
							Add
						</button>
					</form>
					{candidate && (duplicate || looksUnstable) && (
						<p className="border-t px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
							{duplicate
								? "Ids must be unique."
								: "Prefer a stable business id like gift-note over a label or position."}
						</p>
					)}
				</div>

				<div className="flex flex-col gap-3">
					<div className="rounded-xl border bg-muted/30 p-3">
						<p className={eyebrow}>What TypeScript infers</p>
						<p className="mt-2 font-mono text-[12.5px] leading-relaxed">
							<span className="text-violet-600 dark:text-violet-300">type</span>{" "}
							<span className="text-amber-700 dark:text-amber-300">Id</span> ={" "}
							{ids.map((id, index) => (
								<span key={id}>
									{index > 0 && <span className="text-foreground/45"> | </span>}
									<span className="text-emerald-700 dark:text-emerald-300">
										"{id}"
									</span>
								</span>
							))}
						</p>
						<p className="mt-3 font-mono text-[12px] text-muted-foreground">
							match() must handle {ids.length}{" "}
							{ids.length === 1 ? "case" : "cases"}: {ids.join(", ")}
						</p>
					</div>

					<div className="rounded-xl border bg-background p-3">
						<label htmlFor="ids-probe" className={eyebrow}>
							Try an id
						</label>
						<div className="mt-2 flex items-center gap-1 font-mono text-[13px]">
							<span className="shrink-0">stepper.goTo("</span>
							<input
								id="ids-probe"
								className={`${input} h-8 min-w-0 px-2 ${parsed ? "" : "border-red-500/50"}`}
								value={probe}
								autoCapitalize="none"
								autoCorrect="off"
								spellCheck={false}
								onChange={(event) => setProbe(event.target.value)}
							/>
							<span className="shrink-0">")</span>
						</div>
						<div aria-live="polite" className="mt-3 text-[13px]">
							{parsed ? (
								<p className="rounded-lg bg-emerald-500/10 px-2.5 py-2 text-emerald-700 dark:text-emerald-300">
									Compiles. <code className="font-mono">parseStep</code> returns{" "}
									<code className="font-mono">"{parsed}"</code>.
								</p>
							) : (
								<div className="space-y-2 rounded-lg bg-red-500/10 px-2.5 py-2 text-red-700 dark:text-red-300">
									<p>
										<code className="font-mono">ts(2345)</code> Argument of type{" "}
										<code className="font-mono">"{probe}"</code> is not
										assignable to <code className="font-mono">Id</code>.{" "}
										<code className="font-mono">parseStep</code> returns{" "}
										<code className="font-mono">undefined</code>.
									</p>
									{suggestion && (
										<button
											type="button"
											onClick={() => setProbe(suggestion)}
											className="rounded-md bg-background px-2 py-1 text-xs font-medium text-foreground shadow-xs transition-transform duration-150 active:scale-[0.97]"
										>
											Did you mean "{suggestion}"?
										</button>
									)}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}

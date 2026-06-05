import { defineStepper } from "@stepperize/react";
import { Bot, Check, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const workflow = defineStepper([
	{ id: "prompt", title: "Prompt" },
	{ id: "result", title: "Result" },
] as const);

const { Stepper } = workflow;

type Draft = { version: number; prompt: string; text: string };
type Stepper = ReturnType<typeof workflow.useStepper>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// A canned "model" so the demo is self-contained — each call reads the prompt
// and the iteration number from accumulated flow data.
function generate(prompt: string, version: number): string {
	const tone =
		version === 1
			? ""
			: version === 2
				? " (tightened up)"
				: ` (revision ${version})`;
	const subject = prompt.trim() || "your request";
	return `Here's a draft for “${subject}”${tone}. Warm, concise, and ready to send.`;
}

/**
 * Iterative flow: generating is an async transition, and every run is appended
 * to `data` so the review step can show the full version history. "Refine"
 * loops back with `goTo("prompt")`, keeping prior drafts.
 */
export function AiWorkflowBlock() {
	const ref = useRef<Stepper | null>(null);
	const [accepted, setAccepted] = useState(false);

	return (
		<Stepper.Root
			className="w-full max-w-sm overflow-hidden rounded-xl border bg-background shadow-sm"
			beforeStepChange={async ({ from, direction }) => {
				if (from.id !== "prompt" || direction !== "next") return true;
				await sleep(1400); // async "generation"
				const stepper = ref.current;
				if (!stepper) return true;
				const drafts =
					(stepper.data.get("result") as Draft[] | undefined) ?? [];
				const prompt = (stepper.data.get("prompt") as string | undefined) ?? "";
				const version = drafts.length + 1;
				stepper.data.set("result", [
					...drafts,
					{ version, prompt, text: generate(prompt, version) },
				]);
				return true;
			}}
		>
			{({ stepper }) => {
				ref.current = stepper;
				const drafts =
					(stepper.data.get("result") as Draft[] | undefined) ?? [];
				const latest = drafts[drafts.length - 1];
				const prompt =
					(stepper.data.get("prompt") as string | undefined) ??
					"A friendly welcome email for new users";

				return (
					<>
						<div className="flex items-center gap-2 border-b px-4 py-3">
							<span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
								<Bot className="size-4" />
							</span>
							<span className="text-sm font-semibold">Copy Assistant</span>
							{drafts.length > 0 && (
								<Badge variant="secondary" className="ml-auto">
									v{drafts.length}
								</Badge>
							)}
						</div>

						<div className="min-h-44 p-4">
							<Stepper.Content step="prompt" className="space-y-3">
								<p className="text-sm text-muted-foreground">
									{drafts.length
										? "Refine your prompt and regenerate."
										: "What should I write?"}
								</p>
								<Textarea
									rows={3}
									defaultValue={prompt}
									onChange={(e) => stepper.data.set("prompt", e.target.value)}
									className="resize-none"
								/>
								<Button
									className="w-full"
									disabled={stepper.isPending}
									onClick={() => stepper.next()}
								>
									{stepper.isPending ? (
										<>
											<Loader2 className="animate-spin" /> Generating…
										</>
									) : (
										<>
											<Send /> {drafts.length ? "Regenerate" : "Generate"}
										</>
									)}
								</Button>
							</Stepper.Content>

							<Stepper.Content step="result" className="space-y-3">
								<div className="rounded-lg border bg-muted/30 p-3 text-sm">
									<p className="flex items-center gap-1.5 font-medium text-primary">
										<Sparkles className="size-3.5" /> Draft v{latest?.version}
									</p>
									<p className="mt-1.5 text-muted-foreground">
										{accepted
											? "Draft accepted and queued for your campaign."
											: latest?.text}
									</p>
								</div>

								{drafts.length > 1 && (
									<div className="space-y-1">
										<p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
											History
										</p>
										{drafts.slice(0, -1).map((d) => (
											<p
												key={d.version}
												className="truncate text-xs text-muted-foreground/80"
											>
												v{d.version}: {d.text}
											</p>
										))}
									</div>
								)}

								<div className="flex gap-2">
									<Button
										variant="outline"
										className="flex-1"
										onClick={() => stepper.goTo("prompt")}
									>
										<RefreshCw /> Refine
									</Button>
									{accepted ? (
										<Button
											className="flex-1"
											onClick={() => {
												setAccepted(false);
												stepper.data.reset();
												stepper.reset();
											}}
										>
											<RefreshCw /> Start over
										</Button>
									) : (
										<Button
											className="flex-1"
											onClick={() => setAccepted(true)}
										>
											<Check /> Use this
										</Button>
									)}
								</div>
							</Stepper.Content>
						</div>
					</>
				);
			}}
		</Stepper.Root>
	);
}

import { defineStepper } from "@stepperize/react";
import { AlertTriangle, Check, Cloud, Loader2, Server } from "lucide-react";
import { useRef, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const provisioning = defineStepper([
	{ id: "configure", title: "Configure" },
	{ id: "deploy", title: "Deploy" },
	{ id: "live", title: "Live" },
] as const);

const { Stepper } = provisioning;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Async transition with retry: leaving "deploy" runs an async
 * `beforeStepChange` that simulates provisioning. The first attempt fails, the
 * guard returns `false`, and the user stays on the deploy step. `isPending`
 * drives the loading state while the async guard is running.
 */
export function AsyncProvisioningBlock() {
	const [error, setError] = useState<string | null>(null);
	const attempts = useRef(0);

	return (
		<Stepper.Root
			linear
			className="w-full max-w-sm rounded-xl border bg-background p-6 shadow-sm"
			beforeStepChange={async ({ from, direction }) => {
				if (from.id !== "deploy" || direction !== "next") return true;
				setError(null);
				await sleep(1600); // ← the transition is async; isPending is true here
				attempts.current += 1;
				if (attempts.current === 1) {
					setError("Region at capacity. Please retry.");
					return false; // ← failure cancels the move; the user stays on "deploy"
				}
				return true;
			}}
		>
			{({ stepper }) => (
				<>
					<div className="mb-4 flex items-center gap-2.5">
						<span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
							<Server className="size-4" />
						</span>
						<p className="text-sm font-semibold">Provision a database</p>
					</div>

					<div className="min-h-36">
						<Stepper.Content step="configure" className="space-y-3">
							<div className="space-y-1.5">
								<Label>Region</Label>
								<Select defaultValue="us-east-1">
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="us-east-1">us-east-1</SelectItem>
										<SelectItem value="eu-west-1">eu-west-1</SelectItem>
										<SelectItem value="ap-south-1">ap-south-1</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div className="space-y-1.5">
								<Label>Size</Label>
								<Select defaultValue="small">
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="small">Small · 2 vCPU</SelectItem>
										<SelectItem value="medium">Medium · 4 vCPU</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<Button className="w-full" onClick={() => stepper.next()}>
								Continue
							</Button>
						</Stepper.Content>

						<Stepper.Content step="deploy" className="space-y-3">
							<div className="grid place-items-center gap-2 py-2 text-center">
								<span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
									{stepper.isPending ? (
										<Loader2 className="size-6 animate-spin text-primary" />
									) : (
										<Cloud className="size-6" />
									)}
								</span>
								<p className="text-sm text-muted-foreground">
									{stepper.isPending
										? "Provisioning your instance…"
										: "Ready to deploy to us-east-1."}
								</p>
							</div>

							{error && !stepper.isPending && (
								<Alert variant="destructive">
									<AlertTriangle />
									<AlertDescription>{error}</AlertDescription>
								</Alert>
							)}

							<Button
								className="w-full"
								disabled={stepper.isPending}
								onClick={() => stepper.next()}
							>
								{stepper.isPending ? (
									<>
										<Loader2 className="animate-spin" /> Working…
									</>
								) : error ? (
									"Retry deploy"
								) : (
									"Deploy now"
								)}
							</Button>
						</Stepper.Content>

						<Stepper.Content
							step="live"
							className="grid place-items-center gap-2 py-6 text-center"
						>
							<span className="grid size-12 place-items-center rounded-full bg-chart-2/15 text-chart-2">
								<Check className="size-6" />
							</span>
							<p className="text-sm font-medium">Database is live</p>
							<p className="font-mono text-xs text-muted-foreground">
								db.us-east-1.acme.cloud
							</p>
						</Stepper.Content>
					</div>
				</>
			)}
		</Stepper.Root>
	);
}

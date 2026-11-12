"use client";

import {
	Code2,
	Eye,
	Link2,
	Monitor,
	RotateCcw,
	Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/blocks-gallery/copy-button";
import type { StudioConfig } from "@/lib/studio/config";
import { shareUrl } from "@/lib/studio/share";
import { cn } from "@/lib/utils";
import { CodeView } from "./code-view";
import { ConfigPanel } from "./config-panel";
import { InstallBar } from "./install-bar";
import { PreviewStage } from "./preview/preview";
import {
	type StudioDevice,
	StudioProvider,
	type StudioView,
	useStudio,
} from "./studio-provider";

/**
 * Stepper Studio as compound components. `<StudioApp>` is the default
 * arrangement; the parts can be recomposed (a docs embed could render only
 * `Studio.Preview` + `Studio.Install`) without new props on a monolith.
 */

function Shell({ children }: { children: ReactNode }) {
	return (
		<div className="grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)] lg:overflow-hidden">
			{children}
		</div>
	);
}

function Panel() {
	return (
		<aside
			aria-label="Flow configuration"
			className="border-b bg-sidebar/60 lg:min-h-0 lg:overflow-y-auto lg:border-r lg:border-b-0 lg:[scrollbar-gutter:stable]"
		>
			<ConfigPanel />
		</aside>
	);
}

function Workspace({ children }: { children: ReactNode }) {
	return (
		<section
			aria-label="Workspace"
			className="grid min-h-[44rem] min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] lg:min-h-0"
		>
			{children}
		</section>
	);
}

const VIEWS: { value: StudioView; label: string; icon: ReactNode }[] = [
	{
		value: "preview",
		label: "Preview",
		icon: <Eye aria-hidden className="size-3.5" />,
	},
	{
		value: "code",
		label: "Code",
		icon: <Code2 aria-hidden className="size-3.5" />,
	},
];
const DEVICES: { value: StudioDevice; label: string; icon: ReactNode }[] = [
	{
		value: "desktop",
		label: "Desktop",
		icon: <Monitor aria-hidden className="size-3.5" />,
	},
	{
		value: "mobile",
		label: "Mobile",
		icon: <Smartphone aria-hidden className="size-3.5" />,
	},
];

const TAB =
	"pressable inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring aria-selected:bg-background aria-selected:text-foreground aria-selected:shadow-sm aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm pointer-fine:hover:text-foreground";

function Toolbar() {
	const { state, actions, meta } = useStudio();
	return (
		<div className="flex flex-wrap items-center gap-2 border-b px-4 py-2">
			<div
				role="tablist"
				aria-label="View"
				className="flex gap-0.5 rounded-lg bg-muted p-0.5"
			>
				{VIEWS.map((view) => (
					<button
						key={view.value}
						type="button"
						role="tab"
						aria-selected={state.view === view.value}
						onClick={() => actions.setView(view.value)}
						className={TAB}
					>
						{view.icon}
						{view.label}
						{view.value === "code" ? (
							<span className="font-mono text-[10.5px] text-muted-foreground tabular-nums">
								{meta.project.files.length}
							</span>
						) : null}
					</button>
				))}
			</div>
			<div className="ml-auto flex items-center gap-2">
				<fieldset
					aria-label="Device"
					className="flex gap-0.5 rounded-lg bg-muted p-0.5"
				>
					{DEVICES.map((device) => (
						<button
							key={device.value}
							type="button"
							aria-pressed={state.device === device.value}
							aria-label={device.label}
							title={device.label}
							onClick={() => {
								actions.setDevice(device.value);
								actions.setView("preview");
							}}
							className={TAB}
						>
							{device.icon}
						</button>
					))}
				</fieldset>
				<button
					type="button"
					onClick={actions.restartPreview}
					title="Reset the preview state"
					className={cn(TAB, "border bg-background")}
				>
					<RotateCcw aria-hidden className="size-3.5" />
					<span className="max-sm:sr-only">Reset</span>
				</button>
				<CopyButton
					value={shareUrl(
						state.config,
						typeof window === "undefined" ? undefined : window.location.origin,
					)}
					label="Copy share link"
					className={cn(TAB, "border bg-background text-foreground")}
				>
					<Link2 aria-hidden className="size-3.5" />
					<span className="max-sm:sr-only">Share</span>
				</CopyButton>
			</div>
		</div>
	);
}

function Body() {
	const { state } = useStudio();
	return (
		<div className="min-h-0 overflow-auto">
			{state.view === "preview" ? <PreviewStage /> : <CodeView />}
		</div>
	);
}

export const Studio = {
	Provider: StudioProvider,
	Shell,
	Panel,
	Workspace,
	Toolbar,
	Body,
	Install: InstallBar,
};

export function StudioApp({
	initialConfig,
	onConfigChange,
}: {
	initialConfig: StudioConfig;
	onConfigChange?: (config: StudioConfig) => void;
}) {
	return (
		<Studio.Provider
			initialConfig={initialConfig}
			onConfigChange={onConfigChange}
		>
			<Studio.Shell>
				<Studio.Panel />
				<Studio.Workspace>
					<Studio.Toolbar />
					<Studio.Body />
					<Studio.Install />
				</Studio.Workspace>
			</Studio.Shell>
		</Studio.Provider>
	);
}

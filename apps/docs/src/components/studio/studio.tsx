"use client";

import { Code2, Eye, Monitor, RotateCcw, Smartphone } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LIMITS, type StudioConfig } from "@/lib/studio/config";
import { shareUrl } from "@/lib/studio/share";
import { CodeView } from "./code-view";
import { ConfigPanel } from "./config-panel";
import { CopyButton, Segmented } from "./controls";
import { InstallButton } from "./install-bar";
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
 * `Studio.Body` + `Studio.Install`) without new props on a monolith.
 */

function Shell({ children }: { children: ReactNode }) {
	return (
		<div className="grid min-h-0 flex-1 lg:grid-cols-[24rem_minmax(0,1fr)] lg:overflow-hidden">
			{children}
		</div>
	);
}

function Panel() {
	return (
		<aside
			aria-label="Flow configuration"
			className="flex flex-col border-b bg-sidebar/60 lg:min-h-0 lg:border-r lg:border-b-0"
		>
			<ConfigPanel />
		</aside>
	);
}

/** The workspace is one Tabs root: the toolbar holds the list, the body the panels. */
function Workspace({ children }: { children: ReactNode }) {
	const { state, actions } = useStudio();
	return (
		<Tabs
			value={state.view}
			onValueChange={(view) => actions.setView(view as StudioView)}
			render={<section aria-label="Workspace" />}
			className="grid min-h-[44rem] min-w-0 grid-rows-[auto_minmax(0,1fr)] gap-0 lg:min-h-0"
		>
			{children}
		</Tabs>
	);
}

const DEVICES: { value: StudioDevice; label: string; icon: ReactNode }[] = [
	{ value: "desktop", label: "Desktop", icon: <Monitor aria-hidden /> },
	{ value: "mobile", label: "Mobile", icon: <Smartphone aria-hidden /> },
];

/** The flow's name, edited in place at the center of the toolbar. It names the folder, the definition and the components. */
function FlowName() {
	const { state, actions, meta } = useStudio();
	return (
		<div className="flex min-w-0 items-center gap-2">
			<Input
				aria-label="Flow name"
				title={`components/stepperize/${meta.project.names.slug}/`}
				value={state.config.name}
				maxLength={LIMITS.name}
				size={Math.max(8, state.config.name.length + 1)}
				onChange={(event) =>
					actions.update((c) => ({ ...c, name: event.target.value }))
				}
				className="h-7 w-auto max-w-56 border-transparent bg-transparent text-center font-medium shadow-none dark:bg-transparent pointer-fine:hover:border-input"
			/>
		</div>
	);
}

function Toolbar() {
	const { state, actions } = useStudio();
	return (
		<div className="grid h-12 grid-cols-[1fr_auto_1fr] items-center gap-2 border-b px-3">
			<TabsList className="justify-self-start">
				<TabsTrigger value="preview">
					<Eye aria-hidden data-icon="inline-start" />
					Preview
				</TabsTrigger>
				<TabsTrigger value="code">
					<Code2 aria-hidden data-icon="inline-start" />
					Code
				</TabsTrigger>
			</TabsList>
			<FlowName />
			<div className="flex items-center justify-end gap-1.5">
				<Segmented
					label="Preview size"
					value={state.device}
					onChange={(device) => {
						actions.setDevice(device);
						actions.setView("preview");
					}}
					choices={DEVICES}
					className="w-auto"
					itemClassName="w-8 flex-none"
				/>
				<Separator orientation="vertical" className="mx-0.5 h-5" />
				<Button
					type="button"
					variant="ghost"
					size="sm"
					title="Reset the preview state"
					onClick={actions.restartPreview}
				>
					<RotateCcw aria-hidden data-icon="inline-start" />
					<span className="max-sm:sr-only">Reset</span>
				</Button>
				<ShareButton />
				<InstallButton />
			</div>
		</div>
	);
}

function ShareButton() {
	const { state } = useStudio();
	return (
		<CopyButton
			value={shareUrl(
				state.config,
				typeof window === "undefined" ? undefined : window.location.origin,
			)}
			label="Copy share link"
		>
			<span className="max-sm:sr-only">Share</span>
		</CopyButton>
	);
}

function Body() {
	return (
		<div className="grid min-h-0">
			<TabsContent value="preview" className="min-h-0 overflow-auto">
				<PreviewStage />
			</TabsContent>
			<TabsContent value="code" className="min-h-0 overflow-hidden">
				<CodeView />
			</TabsContent>
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
	Install: InstallButton,
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
				</Studio.Workspace>
			</Studio.Shell>
		</Studio.Provider>
	);
}

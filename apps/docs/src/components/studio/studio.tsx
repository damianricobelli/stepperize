"use client";

import {
	Code2,
	Eye,
	Monitor,
	Pencil,
	RotateCcw,
	Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
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
/**
 * The flow's name, edited in place at the center of the toolbar. A labelled
 * field with a pencil, so it reads as "this flow is called…", not a title.
 * The name becomes the folder, the definition and the component prefix.
 */
function FlowName() {
	const { state, actions, meta } = useStudio();
	return (
		<InputGroup
			title={`components/stepperize/${meta.project.names.slug}/`}
			className="h-8 w-auto max-w-80 min-w-0 justify-self-center bg-muted/50 dark:bg-input/30"
		>
			<InputGroupAddon className="border-r pr-2 text-xs font-normal @max-3xl:hidden">
				Flow name
			</InputGroupAddon>
			<InputGroupInput
				aria-label="Flow name"
				value={state.config.name}
				maxLength={LIMITS.name}
				size={Math.max(6, state.config.name.length)}
				onChange={(event) =>
					actions.update((c) => ({ ...c, name: event.target.value }))
				}
				className="w-auto min-w-24 font-medium"
			/>
			<InputGroupAddon align="inline-end">
				<Pencil aria-hidden className="size-3.5" />
			</InputGroupAddon>
		</InputGroup>
	);
}

function Toolbar() {
	const { state, actions } = useStudio();
	return (
		// A container, so labels collapse when the workspace is narrow, not only the viewport.
		<div className="@container grid h-12 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 border-b px-3">
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
					<span className="@max-2xl:sr-only">Reset</span>
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
			<span className="@max-2xl:sr-only">Share</span>
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

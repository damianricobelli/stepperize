"use client";

import {
	createContext,
	type ReactNode,
	use,
	useDeferredValue,
	useEffect,
	useMemo,
	useReducer,
	useState,
} from "react";
import {
	type GeneratedProject,
	generateProject,
} from "@/lib/studio/codegen/generate";
import {
	normalizeConfig,
	PRESETS,
	type PresetId,
	type StudioConfig,
} from "@/lib/studio/config";

/**
 * Studio state, exposed as `{ state, actions, meta }`.
 *
 * The provider is the only place that knows how state is stored. Panels,
 * preview and code view read the interface and never touch the reducer or the
 * URL, so the same pieces could be driven by another store (a saved project,
 * a server draft) by swapping this provider.
 */

export type StudioView = "preview" | "code";
export type StudioDevice = "desktop" | "mobile";

export const PACKAGE_MANAGERS = [
	{ id: "pnpm", exec: "pnpm dlx" },
	{ id: "npm", exec: "npx" },
	{ id: "yarn", exec: "yarn dlx" },
	{ id: "bun", exec: "bunx --bun" },
] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number]["id"];

type StudioState = {
	config: StudioConfig;
	view: StudioView;
	device: StudioDevice;
	file: string | null;
	packageManager: PackageManager;
	/** Bumps to remount the preview with fresh state. */
	previewRun: number;
};

type StudioActions = {
	/** Apply a change; the result is normalized so impossible combinations never exist. */
	update: (recipe: (config: StudioConfig) => StudioConfig) => void;
	loadPreset: (id: PresetId) => void;
	setView: (view: StudioView) => void;
	setDevice: (device: StudioDevice) => void;
	selectFile: (path: string) => void;
	setPackageManager: (pm: PackageManager) => void;
	restartPreview: () => void;
};

type StudioMeta = {
	/** Generated from the deferred config: typing stays responsive on big flows. */
	project: GeneratedProject;
	deferredConfig: StudioConfig;
	/** True while the preview/code lag behind the latest edit. */
	pending: boolean;
	presetId: PresetId | undefined;
};

type StudioContextValue = {
	state: StudioState;
	actions: StudioActions;
	meta: StudioMeta;
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function useStudio(): StudioContextValue {
	const value = use(StudioContext);
	if (!value)
		throw new Error("useStudio must be used inside <StudioProvider>.");
	return value;
}

type Action =
	| { type: "update"; recipe: (config: StudioConfig) => StudioConfig }
	| { type: "preset"; id: PresetId }
	| { type: "set"; patch: Partial<Omit<StudioState, "config">> }
	| { type: "restart" };

function reducer(state: StudioState, action: Action): StudioState {
	switch (action.type) {
		case "update":
			return { ...state, config: normalizeConfig(action.recipe(state.config)) };
		case "preset":
			return {
				...state,
				config: withBase(action.id, state.config.base),
				file: null,
				previewRun: state.previewRun + 1,
			};
		case "set":
			return { ...state, ...action.patch };
		case "restart":
			return { ...state, previewRun: state.previewRun + 1 };
	}
}

/**
 * The base describes the user's project, not the flow: templates keep the
 * one picked, and picking another doesn't make a template "edited".
 */
const withBase = (id: PresetId, base: StudioConfig["base"]): StudioConfig => ({
	...PRESETS[id].config,
	base,
});

function samePreset(config: StudioConfig): PresetId | undefined {
	const json = JSON.stringify(config);
	return (Object.keys(PRESETS) as PresetId[]).find(
		(id) => JSON.stringify(withBase(id, config.base)) === json,
	);
}

export function StudioProvider({
	initialConfig,
	onConfigChange,
	children,
}: {
	initialConfig: StudioConfig;
	/** Called (debounced) with the latest config, e.g. to mirror it into the URL. */
	onConfigChange?: (config: StudioConfig) => void;
	children: ReactNode;
}) {
	const [state, dispatch] = useReducer(reducer, initialConfig, (config) => ({
		config,
		view: "preview" as const,
		device: "desktop" as const,
		file: null,
		packageManager: "pnpm" as const,
		previewRun: 0,
	}));

	const deferredConfig = useDeferredValue(state.config);
	const project = useMemo(
		() => generateProject(deferredConfig),
		[deferredConfig],
	);

	// Mirror into the URL after typing settles. This syncs an external system,
	// which is what effects are for; the handler stays out of the render path.
	const [notify] = useState(() => onConfigChange);
	useEffect(() => {
		if (!notify) return;
		const timer = setTimeout(() => notify(state.config), 400);
		return () => clearTimeout(timer);
	}, [notify, state.config]);

	const actions = useMemo<StudioActions>(
		() => ({
			update: (recipe) => dispatch({ type: "update", recipe }),
			loadPreset: (id) => dispatch({ type: "preset", id }),
			setView: (view) => dispatch({ type: "set", patch: { view } }),
			setDevice: (device) => dispatch({ type: "set", patch: { device } }),
			selectFile: (file) =>
				dispatch({ type: "set", patch: { file, view: "code" } }),
			setPackageManager: (packageManager) =>
				dispatch({ type: "set", patch: { packageManager } }),
			restartPreview: () => dispatch({ type: "restart" }),
		}),
		[],
	);

	const value = useMemo<StudioContextValue>(
		() => ({
			state,
			actions,
			meta: {
				project,
				deferredConfig,
				pending: deferredConfig !== state.config,
				presetId: samePreset(state.config),
			},
		}),
		[state, actions, project, deferredConfig],
	);

	return <StudioContext value={value}>{children}</StudioContext>;
}

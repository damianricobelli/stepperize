import type { Framework, StudioConfig } from "../config";
import { type Names, source, str, USE_CLIENT } from "./shared";

/**
 * Navigation adapters: where the current step lives, per framework.
 *
 * The flow component is router-agnostic. It takes `step` / `onStepChange` and
 * these adapters are the only files that import a router. Swapping Next.js for
 * TanStack Start only rewrites the files below.
 */

export type RouteFile = {
	path: string;
	content: string;
	kind: "page" | "file";
};

const flowImport = (names: Names, file: string, symbol: string) =>
	`import { ${symbol} } from "@/components/stepperize/${names.slug}/${file}";`;

const stepsImport = (names: Names) =>
	flowImport(names, "steps", `${names.flow}Steps`);
const isStep = (names: Names, expr: string) =>
	`${names.flow}Steps.some((item) => item.id === ${expr})`;

// ─── Search params ───────────────────────────────────────────────────────────

function searchParams(framework: Framework, names: Names): RouteFile[] {
	const { slug, Flow } = names;
	const flow = flowImport(names, `${slug}-flow`, `${Flow}Flow`);
	switch (framework) {
		case "nextjs":
			return [
				{
					path: `app/${slug}/page.tsx`,
					kind: "page",
					content: source([
						'import { Suspense } from "react";',
						`import { ${Flow}Client } from "./${slug}-client";`,
						"",
						"// useSearchParams needs a Suspense boundary to prerender the page.",
						`export default function ${Flow}Page() {`,
						"\treturn (",
						"\t\t<Suspense>",
						`\t\t\t<${Flow}Client />`,
						"\t\t</Suspense>",
						"\t);",
						"}",
					]),
				},
				{
					path: `app/${slug}/${slug}-client.tsx`,
					kind: "file",
					content: source([
						USE_CLIENT,
						"",
						'import { usePathname, useRouter, useSearchParams } from "next/navigation";',
						flow,
						"",
						`export function ${Flow}Client() {`,
						"\tconst router = useRouter();",
						"\tconst pathname = usePathname();",
						"\tconst searchParams = useSearchParams();",
						"",
						"\treturn (",
						`\t\t<${Flow}Flow`,
						'\t\t\tstep={searchParams.get("step")}',
						// biome-ignore lint/suspicious/noTemplateCurlyInString: generated source, not a template
						"\t\t\tonStepChange={(step) => router.push(`${pathname}?step=${step}`, { scroll: false })}",
						"\t\t\tonInvalidStep={() => router.replace(pathname, { scroll: false })}",
						"\t\t/>",
						"\t);",
						"}",
					]),
				},
			];
		case "tanstack-start":
			return [
				{
					path: `src/routes/${slug}.tsx`,
					kind: "page",
					content: source([
						'import { createFileRoute } from "@tanstack/react-router";',
						flow,
						"",
						`type ${Flow}Search = { step?: string };`,
						"",
						`export const Route = createFileRoute(${str(`/${slug}`)})({`,
						`\tvalidateSearch: (search: Record<string, unknown>): ${Flow}Search => ({`,
						'\t\tstep: typeof search.step === "string" ? search.step : undefined,',
						"\t}),",
						`\tcomponent: ${Flow}Page,`,
						"});",
						"",
						`function ${Flow}Page() {`,
						"\tconst { step } = Route.useSearch();",
						"\tconst navigate = Route.useNavigate();",
						"",
						"\treturn (",
						`\t\t<${Flow}Flow`,
						"\t\t\tstep={step ?? null}",
						"\t\t\tonStepChange={(next) => navigate({ search: { step: next } })}",
						"\t\t\tonInvalidStep={() => navigate({ search: {}, replace: true })}",
						"\t\t/>",
						"\t);",
						"}",
					]),
				},
			];
		case "react-router":
			return [
				{
					path: `app/routes/${slug}.tsx`,
					kind: "page",
					content: source([
						'import { useSearchParams } from "react-router";',
						flow,
						"",
						`export default function ${Flow}Route() {`,
						"\tconst [searchParams, setSearchParams] = useSearchParams();",
						"",
						"\treturn (",
						`\t\t<${Flow}Flow`,
						'\t\t\tstep={searchParams.get("step")}',
						"\t\t\tonStepChange={(step) => setSearchParams({ step })}",
						"\t\t\tonInvalidStep={() => setSearchParams({}, { replace: true })}",
						"\t\t/>",
						"\t);",
						"}",
					]),
				},
			];
		case "vite":
			return [
				{
					path: `components/stepperize/${slug}/${slug}-page.tsx`,
					kind: "file",
					content: source([
						USE_CLIENT,
						"",
						`import { ${Flow}Flow } from "./${slug}-flow";`,
						'import { useStepParam } from "./use-step-param";',
						"",
						`export function ${Flow}Page() {`,
						"\tconst [step, setStep] = useStepParam();",
						"",
						"\treturn <" +
							`${Flow}Flow step={step} onStepChange={setStep} onInvalidStep={() => setStep(null)} />;`,
						"}",
					]),
				},
			];
	}
}

// ─── One route per step ──────────────────────────────────────────────────────

function routes(framework: Framework, names: Names): RouteFile[] {
	const { slug, Flow } = names;
	const first = names.stepIds[0];
	const flow = flowImport(names, `${slug}-flow`, `${Flow}Flow`);
	const content = flowImport(
		names,
		`${slug}-step-content`,
		`${Flow}StepContent`,
	);
	switch (framework) {
		case "nextjs":
			return [
				{
					path: `app/${slug}/layout.tsx`,
					kind: "page",
					content: source([
						USE_CLIENT,
						"",
						'import { useParams, useRouter } from "next/navigation";',
						'import type { ReactNode } from "react";',
						flow,
						"",
						"// The layout survives step navigation, so flow data stays in memory.",
						`export default function ${Flow}Layout({ children }: { children: ReactNode }) {`,
						"\tconst { step } = useParams<{ step?: string }>();",
						"\tconst router = useRouter();",
						"",
						"\treturn (",
						`\t\t<${Flow}Flow step={step ?? null} onStepChange={(next) => router.push(\`/${slug}/\${next}\`)}>`,
						"\t\t\t{children}",
						`\t\t</${Flow}Flow>`,
						"\t);",
						"}",
					]),
				},
				{
					path: `app/${slug}/page.tsx`,
					kind: "page",
					content: source([
						'import { redirect } from "next/navigation";',
						"",
						`export default function ${Flow}IndexPage() {`,
						`\tredirect(${str(`/${slug}/${first}`)});`,
						"}",
					]),
				},
				{
					path: `app/${slug}/[step]/page.tsx`,
					kind: "page",
					content: source([
						'import { notFound } from "next/navigation";',
						content,
						stepsImport(names),
						"",
						"export function generateStaticParams() {",
						`\treturn ${names.flow}Steps.map((step) => ({ step: step.id }));`,
						"}",
						"",
						`export default async function ${Flow}StepPage({ params }: { params: Promise<{ step: string }> }) {`,
						"\tconst { step } = await params;",
						`\tif (!${isStep(names, "step")}) notFound();`,
						`\treturn <${Flow}StepContent />;`,
						"}",
					]),
				},
			];
		case "tanstack-start":
			return [
				{
					path: `src/routes/${slug}.tsx`,
					kind: "page",
					content: source([
						'import { createFileRoute, Outlet, useNavigate, useParams } from "@tanstack/react-router";',
						flow,
						"",
						`export const Route = createFileRoute(${str(`/${slug}`)})({`,
						`\tcomponent: ${Flow}Layout,`,
						"});",
						"",
						"// The layout survives step navigation, so flow data stays in memory.",
						`function ${Flow}Layout() {`,
						"\tconst { step } = useParams({ strict: false });",
						"\tconst navigate = useNavigate();",
						"",
						"\treturn (",
						`\t\t<${Flow}Flow`,
						"\t\t\tstep={step ?? null}",
						`\t\t\tonStepChange={(next) => navigate({ to: ${str(`/${slug}/$step`)}, params: { step: next } })}`,
						"\t\t>",
						"\t\t\t<Outlet />",
						`\t\t</${Flow}Flow>`,
						"\t);",
						"}",
					]),
				},
				{
					path: `src/routes/${slug}.index.tsx`,
					kind: "page",
					content: source([
						'import { createFileRoute, redirect } from "@tanstack/react-router";',
						"",
						`export const Route = createFileRoute(${str(`/${slug}/`)})({`,
						"\tbeforeLoad: () => {",
						`\t\tthrow redirect({ to: ${str(`/${slug}/$step`)}, params: { step: ${str(first)} } });`,
						"\t},",
						"});",
					]),
				},
				{
					path: `src/routes/${slug}.$step.tsx`,
					kind: "page",
					content: source([
						'import { createFileRoute, notFound } from "@tanstack/react-router";',
						content,
						stepsImport(names),
						"",
						`export const Route = createFileRoute(${str(`/${slug}/$step`)})({`,
						"\tbeforeLoad: ({ params }) => {",
						`\t\tif (!${isStep(names, "params.step")}) throw notFound();`,
						"\t},",
						`\tcomponent: ${Flow}StepContent,`,
						"});",
					]),
				},
			];
		case "react-router":
			return [
				{
					path: `app/routes/${slug}.tsx`,
					kind: "page",
					content: source([
						'import { Outlet, useNavigate, useParams } from "react-router";',
						flow,
						"",
						"// Uses the flatRoutes() convention from @react-router/fs-routes.",
						"// The layout survives step navigation, so flow data stays in memory.",
						`export default function ${Flow}Layout() {`,
						"\tconst { step } = useParams();",
						"\tconst navigate = useNavigate();",
						"",
						"\treturn (",
						`\t\t<${Flow}Flow step={step ?? null} onStepChange={(next) => navigate(\`/${slug}/\${next}\`)}>`,
						"\t\t\t<Outlet />",
						`\t\t</${Flow}Flow>`,
						"\t);",
						"}",
					]),
				},
				{
					path: `app/routes/${slug}._index.tsx`,
					kind: "page",
					content: source([
						'import { redirect } from "react-router";',
						"",
						"export function loader() {",
						`\treturn redirect(${str(`/${slug}/${first}`)});`,
						"}",
					]),
				},
				{
					path: `app/routes/${slug}.$step.tsx`,
					kind: "page",
					content: source([
						'import { data, type LoaderFunctionArgs } from "react-router";',
						content,
						stepsImport(names),
						"",
						"export function loader({ params }: LoaderFunctionArgs) {",
						`\tif (!${isStep(names, "params.step")}) throw data(null, { status: 404 });`,
						"\treturn null;",
						"}",
						"",
						`export default function ${Flow}StepRoute() {`,
						`\treturn <${Flow}StepContent />;`,
						"}",
					]),
				},
			];
		case "vite":
			return [];
	}
}

export function generateRouteFiles(
	config: StudioConfig,
	names: Names,
): RouteFile[] {
	if (config.navigation === "search-params")
		return searchParams(config.framework, names);
	if (config.navigation === "routes") return routes(config.framework, names);
	return [];
}

/** Where to look after installing, in plain words. */
export function usageNote(config: StudioConfig, names: Names): string {
	const first = names.stepIds[0];
	if (config.navigation === "component")
		return `Render <${names.Flow}Flow /> anywhere. Its state lives in memory.`;
	if (config.navigation === "routes")
		return `Open /${names.slug}. It redirects to /${names.slug}/${first}.`;
	if (config.framework === "vite")
		return `Render <${names.Flow}Page />. The step is kept in ?step=.`;
	return `Open /${names.slug}?step=${first}. Back and forward move between steps.`;
}

export const USE_STEP_PARAM = source([
	'import { useCallback, useSyncExternalStore } from "react";',
	"",
	"function subscribe(notify: () => void) {",
	'\twindow.addEventListener("popstate", notify);',
	'\treturn () => window.removeEventListener("popstate", notify);',
	"}",
	"",
	'const readStep = () => new URLSearchParams(window.location.search).get("step");',
	"",
	"/** Keeps the current step in ?step= so refresh and back/forward work. */",
	"export function useStepParam() {",
	"\tconst step = useSyncExternalStore(subscribe, readStep, () => null);",
	"\tconst setStep = useCallback((next: string | null) => {",
	"\t\tconst url = new URL(window.location.href);",
	'\t\tif (next) url.searchParams.set("step", next);',
	'\t\telse url.searchParams.delete("step");',
	'\t\twindow.history.pushState(null, "", url);',
	'\t\twindow.dispatchEvent(new PopStateEvent("popstate"));',
	"\t}, []);",
	"\treturn [step, setStep] as const;",
	"}",
]);

export const USE_SAVED_DRAFT = source([
	'import { useCallback, useState } from "react";',
	"",
	"function read<T>(key: string): T | undefined {",
	'\tif (typeof window === "undefined") return undefined;',
	"\ttry {",
	"\t\tconst raw = window.localStorage.getItem(key);",
	"\t\treturn raw ? (JSON.parse(raw) as T) : undefined;",
	"\t} catch {",
	"\t\treturn undefined;",
	"\t}",
	"}",
	"",
	"/**",
	" * Restores flow data once and writes every change back.",
	" * Version the key when the step schemas change shape.",
	" */",
	"export function useSavedDraft<T>(key: string) {",
	"\tconst [data] = useState(() => read<T>(key));",
	"\tconst save = useCallback(",
	"\t\t(next: T) => {",
	"\t\t\ttry {",
	"\t\t\t\twindow.localStorage.setItem(key, JSON.stringify(next));",
	"\t\t\t} catch {",
	"\t\t\t\t// Storage can be full or blocked. The flow keeps working without it.",
	"\t\t\t}",
	"\t\t},",
	"\t\t[key],",
	"\t);",
	"\treturn { data, save };",
	"}",
]);

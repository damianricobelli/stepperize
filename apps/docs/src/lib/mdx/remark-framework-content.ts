import { existsSync } from "node:fs";
import { join } from "node:path";
import { replaceSource } from "fumadocs-core/mdx-plugins/stringifier";
import { DEFAULT_FRAMEWORK, isDocsFramework } from "../frameworks";

/**
 * Framework-aware content, resolved when a page compiles.
 *
 * A concept page is written once, in `content/shared/`, and each framework has
 * a thin page that `<include>`s it (see the README). This plugin runs on every
 * page right after the include is inlined, knows the page's framework from its
 * path (`content/docs/docs/v9/vue/...`), and keeps only what that framework
 * reads:
 *
 * - `<FrameworkCode>` holds code blocks marked `framework="vue"` (or several:
 *   `framework="react solid"`). The page keeps its framework's blocks, or the
 *   `core` blocks when it has none, and the build fails when it has neither.
 * - `<FrameworkOnly is="angular lit">` (or `not="..."`) keeps or drops prose.
 * - A link to `/docs/v9/:framework/...` goes to the page's framework when that
 *   page exists, else to React's, and the build fails when neither exists.
 *
 * Nothing of the other frameworks reaches the page: not the HTML, the bundle,
 * the table of contents, search, nor the processed markdown behind `.md` and
 * `llms.txt` (the source-based markdown is edited with `replaceSource`).
 */

type Node = Parameters<typeof replaceSource>[1];
type File = Parameters<typeof replaceSource>[0];
type Parent = Extract<Node, { children: unknown[] }>;
type Element = Extract<
	Node,
	{ type: "mdxJsxFlowElement" | "mdxJsxTextElement" }
>;
type Code = Extract<Node, { type: "code" }>;
type Link = Extract<Node, { type: "link" }>;

/** The framework whose samples stand in for a framework that has none: the flow without a framework. */
export const FALLBACK_FRAMEWORK = "core";

/** Where a link names the page's own framework: `/docs/v9/:framework/guides/forms`. */
export const FRAMEWORK_PLACEHOLDER = ":framework";

const PLACEHOLDER_LINK = /^\/docs\/(v\d+)\/:framework(\/[^#?]*)?([#?].*)?$/;

/** The version and framework of a docs page, from its file path. */
export function pageFramework(
	filePath: string,
): { docs: string; version: string; framework: string } | undefined {
	const match = filePath
		.replaceAll("\\", "/")
		.match(/^(.*\/docs)\/(v\d+)\/([^/]+)\/.+\.mdx?$/);
	if (!match || !isDocsFramework(match[3])) return undefined;
	return { docs: match[1], version: match[2], framework: match[3] };
}

/** The frameworks a code block is for, from `framework="vue svelte"` in its meta, and the rest of the meta. */
export function codeFrameworks(meta: string | null | undefined): {
	frameworks: string[];
	meta: string | undefined;
} {
	const match = meta?.match(/(?:^|\s)framework=(?:"([^"]*)"|'([^']*)')/);
	if (!meta || !match) return { frameworks: [], meta: meta ?? undefined };
	const rest = meta.replace(match[0], " ").replace(/\s+/g, " ").trim();
	return {
		frameworks: (match[1] ?? match[2] ?? "").split(/[\s,]+/).filter(Boolean),
		meta: rest || undefined,
	};
}

/** The samples a framework reads: its own, or the fallback's. `undefined` when there are neither. */
export function pickSamples<T extends { frameworks: readonly string[] }>(
	samples: readonly T[],
	framework: string,
): T[] | undefined {
	const own = samples.filter((sample) => sample.frameworks.includes(framework));
	if (own.length > 0) return own;
	const fallback = samples.filter((sample) =>
		sample.frameworks.includes(FALLBACK_FRAMEWORK),
	);
	return fallback.length > 0 ? fallback : undefined;
}

/**
 * The URL a placeholder link goes to on a framework's page: that framework's
 * page when it exists, else the default framework's. `undefined` when neither
 * exists. Other URLs are returned as they are.
 */
export function resolveFrameworkLink(
	url: string,
	framework: string,
	exists: (version: string, framework: string, path: string) => boolean,
): string | undefined {
	const match = url.match(PLACEHOLDER_LINK);
	if (!match) return url;
	const [, version, path = "", rest = ""] = match;
	const target = [framework, DEFAULT_FRAMEWORK].find((candidate) =>
		exists(version, candidate, path.replace(/^\/|\/$/g, "")),
	);
	return target && `/docs/${version}/${target}${path}${rest}`;
}

/** Whether `<FrameworkOnly is="..." not="...">` keeps its content for a framework. */
export function frameworkOnlyApplies(
	attributes: { is?: string; not?: string },
	framework: string,
): boolean {
	const list = (value?: string) => value?.split(/[\s,]+/).filter(Boolean);
	const is = list(attributes.is);
	const not = list(attributes.not);
	if (is && !is.includes(framework)) return false;
	if (not?.includes(framework)) return false;
	return true;
}

/** The node as the MDX element of that name, if it is one. */
const asElement = (node: Node, name: string): Element | undefined =>
	(node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
	node.name === name
		? node
		: undefined;

function stringAttributes(node: Element): Record<string, string> {
	const out: Record<string, string> = {};
	for (const attribute of node.attributes) {
		if (
			attribute.type === "mdxJsxAttribute" &&
			typeof attribute.value === "string"
		)
			out[attribute.name] = attribute.value;
	}
	return out;
}

function fence(code: Code): string {
	let marker = "```";
	while (code.value.includes(marker)) marker += "`";
	const info = [code.lang, code.meta].filter(Boolean).join(" ");
	return `${marker}${info}\n${code.value}\n${marker}`;
}

function pageExists(docs: string) {
	return (version: string, framework: string, path: string) => {
		const base = join(docs, version, framework, path);
		return existsSync(`${base}.mdx`) || existsSync(join(base, "index.mdx"));
	};
}

export function remarkFrameworkContent() {
	return (tree: Parent, file: File) => {
		const page = file.path ? pageFramework(file.path) : undefined;
		const exists = page && pageExists(page.docs);

		const visit = (parent: Parent) => {
			const children = parent.children as Node[];
			for (let i = 0; i < children.length; i++) {
				const node = children[i];
				const framework = page?.framework;
				const group = asElement(node, "FrameworkCode");
				const only = asElement(node, "FrameworkOnly");

				if (group) {
					if (!framework)
						file.fail(
							"<FrameworkCode> is only resolved in a framework's docs (content/docs/docs/{version}/{framework}/...).",
							group,
						);
					const samples = (group.children as Node[])
						.filter((child) => !(child.type === "text" && !child.value.trim()))
						.map((child) => {
							if (child.type !== "code")
								file.fail(
									'<FrameworkCode> holds only code blocks, each marked like ```tsx framework="react"```.',
									child,
								);
							const code = child as Code;
							const parsed = codeFrameworks(code.meta);
							if (parsed.frameworks.length === 0)
								file.fail(
									`A code block in <FrameworkCode> has no framework="..." in its meta: \`${code.lang ?? ""} ${code.meta ?? ""}\`.`,
									code,
								);
							return { code, ...parsed };
						});
					const picked = pickSamples(samples, framework);
					if (!picked) {
						const listed = [
							...new Set(samples.flatMap((s) => s.frameworks)),
						].join(", ");
						file.fail(
							`<FrameworkCode> has no sample for "${framework}" and no "${FALLBACK_FRAMEWORK}" sample to fall back to (it has: ${listed}).`,
							group,
						);
					}
					const kept = picked.map(({ code, meta }) => {
						code.meta = meta ?? null;
						replaceSource(file, code, fence(code));
						return code;
					});
					children.splice(i, 1, ...kept);
					replaceSource(file, group, (s) =>
						kept.map((code) => s.stringify(code)).join("\n\n"),
					);
					i += kept.length - 1;
					continue;
				}

				if (only) {
					if (!framework)
						file.fail(
							"<FrameworkOnly> is only resolved in a framework's docs (content/docs/docs/{version}/{framework}/...).",
							only,
						);
					const keep = frameworkOnlyApplies(stringAttributes(only), framework);
					const inner = keep ? (only.children as Node[]) : [];
					children.splice(i, 1, ...inner);
					replaceSource(file, only, keep ? (s) => s.inner(only) : "");
					// Visit what was unwrapped: it can hold more framework content.
					i--;
					continue;
				}

				if (node.type === "link" && node.url.includes(FRAMEWORK_PLACEHOLDER)) {
					if (!framework || !exists)
						file.fail(
							`A link to ${node.url} is only resolved in a framework's docs.`,
							node,
						);
					const url = resolveFrameworkLink(node.url, framework, exists);
					if (!url)
						file.fail(
							`${node.url} has no page for "${framework}" nor "${DEFAULT_FRAMEWORK}".`,
							node,
						);
					const link = node as Link;
					link.url = url;
					replaceSource(
						file,
						link,
						(s) =>
							`[${s.inner(link)}](${url}${link.title ? ` "${link.title}"` : ""})`,
					);
				}

				if ("children" in node) visit(node as Parent);
			}
		};

		visit(tree);
	};
}

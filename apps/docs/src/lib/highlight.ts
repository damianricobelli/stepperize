import { createServerFn } from "@tanstack/react-start";
import { getHighlighter } from "fumadocs-core/highlight";

/** Languages the Blocks gallery highlights (all Shiki bundled languages). */
type HighlightLang = "tsx" | "ts" | "jsx" | "js" | "json" | "bash";

/**
 * Server-side Shiki highlighting for the Blocks gallery.
 *
 * Returns a serializable HTML string (dual light/dark themes via CSS vars) so it
 * can be used from route loaders (SSR'd) *and* called as an RPC from the client
 * when a Code tab opens — without shipping the Shiki bundle to the browser. The
 * underlying highlighter instance is cached by fumadocs across calls.
 */
export const highlightCode = createServerFn({ method: "POST" })
	.inputValidator((data: { code: string; lang?: HighlightLang }) => data)
	.handler(async ({ data }) => {
		const lang: HighlightLang = data.lang ?? "tsx";
		const highlighter = await getHighlighter("js", {
			langs: [lang],
			themes: ["github-light", "github-dark"],
		});
		const html = highlighter.codeToHtml(data.code, {
			lang,
			themes: { light: "github-light", dark: "github-dark" },
			defaultColor: false,
		});
		return { html };
	});

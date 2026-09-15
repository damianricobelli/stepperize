import { getHighlighter } from "fumadocs-core/highlight";
import { transformerTwoslash } from "fumadocs-twoslash";
import { expect, it } from "vitest";

it("resolves native TypeScript information through the installed Twoslash transformer", async () => {
	const highlighter = await getHighlighter("js", {
		langs: ["js", "jsx", "ts", "tsx"],
		themes: ["github-light"],
	});
	const html = highlighter.codeToHtml('const greeting = "hello";\ngreeting;', {
		lang: "ts",
		theme: "github-light",
		transformers: [transformerTwoslash({ explicitTrigger: false })],
	});
	expect(html).toContain("twoslash-hover");
	expect(html).toContain("greeting");
	expect(html).toContain("twoslash-popup-code");
});

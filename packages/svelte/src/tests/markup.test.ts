import { expect, it } from "vitest";
import { commands } from "vitest/browser";

declare module "vitest/browser" {
	interface BrowserCommands {
		svelteCheck: () => Promise<{ errors: { file: string; line: number; message: string }[]; source: string }>;
	}
}

const file = "src/tests/markup/Wrong.svelte";

it("rejects wrong ids, data, bindings and snippet props in markup", { timeout: 60_000 }, async () => {
	const { errors, source } = await commands.svelteCheck();
	// `// error: …` in script, `<!-- error: … -->` in markup: that error is expected on the next line.
	const wanted = source.split("\n").flatMap((line, index) => {
		const marker = /(?:<!--|\/\/) error: (.+?)(?: -->)?$/.exec(line.trim());
		return marker ? [{ line: index + 2, text: marker[1] }] : [];
	});
	expect(wanted.length).toBeGreaterThan(5);
	// Every error is a marked one, in the marked file.
	for (const error of errors) {
		expect(error.file).toBe(file);
		expect(wanted.map((entry) => entry.line)).toContain(error.line);
	}
	// Every marked line fails, for the marked reason.
	for (const entry of wanted) {
		const messages = errors.filter((error) => error.line === entry.line).map((error) => error.message);
		expect(messages, `line ${entry.line}: ${entry.text}`).toEqual([expect.stringContaining(entry.text)]);
	}
});

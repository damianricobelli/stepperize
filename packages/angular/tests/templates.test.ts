// @vitest-environment node
import { fileURLToPath } from "node:url";
import { type CompilerOptions, formatDiagnostics, performCompilation, readConfiguration } from "@angular/compiler-cli";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/**
 * The library's declarations, as they are published: compiled with an empty registry. An input whose
 * type is inferred instead of written would be published as `string` and check nothing.
 */
const published = (() => {
	let paths: Record<string, string[]> | undefined;
	return () => {
		if (paths) return paths;
		const out = here("../node_modules/.cache/template-tests");
		const config = readConfiguration(here("../tsconfig.lib.json"));
		const options = { ...config.options, outDir: out, declaration: true, noEmit: false };
		const { diagnostics } = performCompilation({ rootNames: config.rootNames, options });
		if (diagnostics.length) throw new Error(formatDiagnostics(diagnostics));
		paths = {
			"@stepperize/angular": [`${out}/src/public-api.d.ts`],
			"@stepperize/angular/headless": [`${out}/headless/src/public-api.d.ts`],
		};
		return paths;
	};
})();

/**
 * Compile one file the way an application does, with the template type-checker in strict mode, and
 * return each error as `line: message`. Each file is its own program, so a registry declared in one
 * does not leak into the other.
 */
function compile(file: string, against: "source" | "published") {
	const config = readConfiguration(here("../tsconfig.json"));
	const options: CompilerOptions = { ...config.options, noEmit: true, strictTemplates: true, types: [] };
	if (against === "published") options.paths = published();
	const { diagnostics } = performCompilation({ rootNames: [here(file)], options });
	const errors = diagnostics.filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
	return errors.map((error) => {
		// Only the fixture may fail: anything else is a broken setup, reported as it is.
		if (!error.file?.fileName.endsWith(file.replace("./", ""))) throw new Error(formatDiagnostics([error]));
		const text = ts.flattenDiagnosticMessageText(error.messageText, "\n").split("\n")[0];
		const { line } = error.file.getLineAndCharacterOfPosition(error.start ?? 0);
		return `${error.file.text.split("\n")[line].trim()} -> ${text}`;
	});
}

describe.for(["source", "published"] as const)("template type-checking of step ids, %s", (against) => {
	it("with a registry, a step id that is not registered does not compile", () => {
		expect(compile("./templates/registered.ts", against)).toEqual([
			`<li stepperItem="paymnt"></li> -> Type '"paymnt"' is not assignable to type 'Step | "shipping" | "payment"'. Did you mean '"payment"'?`,
			`<li stepperItem="payment" #payment="stepperItem">{{ payment.value().step.colour }}</li> -> Property 'colour' does not exist on type '{ readonly id: "payment"; readonly title: "Payment"; readonly icon: "card"; }'.`,
			`<button stepperTrigger="shiping">Shipping</button> -> Type '"shiping"' is not assignable to type '"" | "shipping" | "payment" | undefined'. Did you mean '"shipping"'?`,
			`<span stepperIndicator="paymet"></span> -> Type '"paymet"' is not assignable to type '"" | "shipping" | "payment" | undefined'. Did you mean '"payment"'?`,
			`<div stepperContent="shiping"></div> -> Type '"shiping"' is not assignable to type '"shipping" | "payment"'. Did you mean '"shipping"'?`,
		]);
	}, 60_000);

	it("without one, ids are strings, and an item bound to a step still types its fields", () => {
		expect(compile("./templates/unregistered.ts", against)).toEqual([
			expect.stringMatching(/typo\.value\(\)\.step\.colour.*Property 'colour' does not exist/),
			expect.stringMatching(/\[stepperContent\]="42".*Type 'number' is not assignable to type 'string'/),
		]);
	}, 60_000);
});

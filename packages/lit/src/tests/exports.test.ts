// @vitest-environment node
import ts from "typescript";
import { describe, expect, it } from "vitest";

const dist = (file: string) => decodeURIComponent(new URL(`../../dist/${file}`, import.meta.url).pathname);

/** The names a declaration file says exist at runtime: values, not types. */
function declaredValues(file: string) {
	const program = ts.createProgram([file], { noEmit: true, skipLibCheck: true });
	const checker = program.getTypeChecker();
	const source = program.getSourceFile(file);
	const module = source && checker.getSymbolAtLocation(source);
	if (!module) throw new Error(`No module in ${file}`);
	return checker
		.getExportsOfModule(module)
		.filter((symbol) => {
			const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
			return target.flags & ts.SymbolFlags.Value;
		})
		.map((symbol) => symbol.name)
		.sort();
}

// Built by CI before the tests run (see checks.yml); run `pnpm build` first locally.
describe.runIf(ts.sys.fileExists(dist("index.js")))("the built package", () => {
	it.each(["index", "headless"])(
		"%s: the declarations promise exactly the values the module exports",
		async (entry) => {
			const module = await import(/* @vite-ignore */ dist(`${entry}.js`));
			expect(declaredValues(dist(`${entry}.d.ts`))).toEqual(Object.keys(module).sort());
		},
	);

	it("keeps the internals out of the declarations", () => {
		const declarations = ts.sys
			.readDirectory(dist(""), [".d.ts"])
			.map((file) => ts.sys.readFile(file) ?? "")
			.join("");
		for (const name of ["_attach", "_detach", "PartDirective", "type Part ", "protected"]) {
			expect(declarations, name).not.toContain(name);
		}
	});
});

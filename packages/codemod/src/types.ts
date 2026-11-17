import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

export type Diagnostic = { file: string; line: number; column: number; message: string };

/** The user's own TypeScript, asked what the syntax alone cannot tell. */
export type Project = {
	/** The path of the config the project was loaded from. */
	config: string;
	/** Declarations of `file` whose type is a stepper, as `line:name`. `undefined` when the file is not in the project. */
	typed(file: string): Set<string> | undefined;
	/** Type errors in these files. */
	diagnostics(files: string[]): Diagnostic[];
};

/** What every stepper has, in v8 and in v9. Checked by shape: an alias does not survive `Stepper<S> & Extra`. */
const SHAPE = ["steps", "current", "next", "prev", "goTo", "isFirst", "isLast", "canGoTo", "match"];

/**
 * Load the project `cwd` belongs to with the TypeScript it has installed. `overrides` replaces the
 * content of files on disk, so types are read from code that was not written yet.
 *
 * Returns `undefined` when there is no TypeScript, no config, or an API this code cannot use:
 * the codemod then works from the syntax alone.
 */
export function loadProject(cwd: string, overrides: ReadonlyMap<string, string>): Project | undefined {
	try {
		const ts: any = createRequire(join(cwd, "package.json"))("typescript");
		if (typeof ts?.createProgram !== "function") return undefined;
		const found: string | undefined = ts.findConfigFile(cwd, ts.sys.fileExists);
		if (!found) return undefined;

		const parse = (path: string) =>
			ts.getParsedCommandLineOfConfigFile(path, {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic() {} });
		const wanted = [...overrides.keys()];
		// A solution config lists no files, only references: use the referenced project that has ours.
		const candidates: string[] = [found];
		for (const reference of parse(found)?.projectReferences ?? []) {
			const path: string = ts.resolveProjectReferencePath(reference);
			if (existsSync(path)) candidates.push(path);
		}
		let config = found;
		let parsed = parse(found);
		let best = -1;
		for (const candidate of candidates) {
			const entry = parse(candidate);
			if (!entry) continue;
			const names = new Set<string>(entry.fileNames.map((name: string) => resolve(name)));
			const score = wanted.filter((file) => names.has(file)).length;
			if (score > best) {
				best = score;
				parsed = entry;
				config = candidate;
			}
		}
		if (!parsed) return undefined;

		const host = ts.createCompilerHost(parsed.options, true);
		const readFile = host.readFile.bind(host);
		const getSourceFile = host.getSourceFile.bind(host);
		host.readFile = (file: string) => overrides.get(resolve(file)) ?? readFile(file);
		host.getSourceFile = (file: string, languageVersion: unknown, ...rest: unknown[]) => {
			const text = overrides.get(resolve(file));
			return text === undefined
				? getSourceFile(file, languageVersion, ...rest)
				: ts.createSourceFile(file, text, languageVersion, true);
		};
		const program = ts.createProgram({
			// Files handed to the codemod are checked even when the config does not list them.
			rootNames: [...new Set([...parsed.fileNames.map((name: string) => resolve(name)), ...wanted])],
			options: { ...parsed.options, noEmit: true },
			host,
		});
		const checker = program.getTypeChecker();

		const isStepper = (type: any): boolean => {
			const present = checker.getNonNullableType(type);
			if (present.isUnion?.()) return present.types.length > 0 && present.types.every(isStepper);
			return SHAPE.every((name) => present.getProperty?.(name));
		};

		return {
			config,
			typed(file) {
				const source = program.getSourceFile(resolve(file));
				if (!source) return undefined;
				const names = new Set<string>();
				const visit = (node: any) => {
					const declares =
						(ts.isVariableDeclaration(node) || ts.isParameter(node) || ts.isBindingElement(node)) &&
						ts.isIdentifier(node.name);
					if (declares && isStepper(checker.getTypeAtLocation(node.name))) {
						const { line } = source.getLineAndCharacterOfPosition(node.name.getStart(source));
						names.add(`${line + 1}:${node.name.text}`);
					}
					ts.forEachChild(node, visit);
				};
				visit(source);
				return names;
			},
			diagnostics(files) {
				return files.flatMap((file) => {
					const source = program.getSourceFile(resolve(file));
					if (!source) return [];
					return [...program.getSyntacticDiagnostics(source), ...program.getSemanticDiagnostics(source)].map(
						(diagnostic: any) => {
							const at = source.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
							return {
								file,
								line: at.line + 1,
								column: at.character + 1,
								message: ts.flattenDiagnosticMessageText(diagnostic.messageText, " "),
							};
						},
					);
				});
			},
		};
	} catch {
		return undefined;
	}
}

/** The closest folder, from `from` up, that has a `package.json`: where the project's TypeScript is installed. */
export function projectRoot(from: string): string {
	let folder = resolve(from);
	while (!existsSync(join(folder, "package.json")) && dirname(folder) !== folder) folder = dirname(folder);
	return folder;
}

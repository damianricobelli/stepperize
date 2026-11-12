/**
 * A tiny TS/TSX tokenizer for the Studio code view.
 *
 * The Blocks gallery highlights with Shiki on the server, which is right for
 * static source. Studio code changes on every keystroke, so it highlights
 * locally: no request per change, and no Shiki in the client bundle.
 */

export type TokenKind =
	| "plain"
	| "keyword"
	| "string"
	| "tag"
	| "comment"
	| "number";
export type Token = { kind: TokenKind; text: string };

const KEYWORDS = new Set(
	"import from export const let function return async await type if else default as new true false null undefined try catch typeof extends satisfies throw".split(
		" ",
	),
);

// Hoisted: one RegExp, reset per call (js-hoist-regexp).
const TOKEN =
	// A tag starts where an expression can (not right after an identifier, which is a generic).
	/(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`)|((?<![\w$)\]])<\/?[A-Za-z][\w.]*)|\b([A-Za-z_$][\w$]*)\b|\b(\d+(?:\.\d+)?)\b/g;

export function tokenize(source: string): Token[][] {
	const flat: Token[] = [];
	let last = 0;
	TOKEN.lastIndex = 0;
	for (let match = TOKEN.exec(source); match; match = TOKEN.exec(source)) {
		if (match.index > last)
			flat.push({ kind: "plain", text: source.slice(last, match.index) });
		const [text, comment, string, tag, word, number] = match;
		const kind: TokenKind = comment
			? "comment"
			: string
				? "string"
				: tag
					? "tag"
					: number
						? "number"
						: word && KEYWORDS.has(word)
							? "keyword"
							: "plain";
		flat.push({ kind, text });
		last = TOKEN.lastIndex;
	}
	if (last < source.length)
		flat.push({ kind: "plain", text: source.slice(last) });

	// Split into lines so the view can number them; multi-line tokens split too.
	const lines: Token[][] = [[]];
	for (const token of flat) {
		const parts = token.text.split("\n");
		parts.forEach((part, i) => {
			if (i > 0) lines.push([]);
			if (part) lines[lines.length - 1].push({ kind: token.kind, text: part });
		});
	}
	return lines;
}

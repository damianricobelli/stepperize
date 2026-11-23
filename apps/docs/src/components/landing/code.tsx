import type { ReactNode } from "react";

/**
 * A small highlighter for the landing page's snippets, line by line, in every
 * syntax they use: TS and TSX, Vue single-file components, Svelte, Angular
 * decorators and control flow, Lit `html` templates and plain HTML. It is not
 * a parser: it is tuned to read well on the code we wrote, in both themes,
 * without shipping a grammar to the homepage.
 */

export type TokenKind =
	| "comment"
	| "string"
	| "keyword"
	| "tag"
	| "attr"
	| "fn"
	| "number"
	| "punct";

export type Token = { kind?: TokenKind; text: string };

/** The same palette as the hand-tokenized snippets (`K`, `F`, `S`... in `shared.tsx`). */
export const TOKEN_CLASS: Record<TokenKind, string> = {
	comment: "text-muted-foreground",
	string: "text-emerald-700 dark:text-emerald-300",
	keyword: "text-violet-600 dark:text-violet-300",
	tag: "text-amber-700 dark:text-amber-300",
	attr: "text-sky-700 dark:text-sky-300",
	fn: "text-sky-700 dark:text-sky-300",
	number: "text-amber-700 dark:text-amber-300",
	punct: "text-foreground/45",
};

const KEYWORDS = new Set([
	"as",
	"async",
	"await",
	"case",
	"class",
	"const",
	"else",
	"export",
	"extends",
	"false",
	"from",
	"function",
	"if",
	"import",
	"let",
	"new",
	"null",
	"readonly",
	"return",
	"switch",
	"this",
	"true",
	"type",
]);

/** `onClick=`, `@click=`, `:disabled=`, `v-if=`, `(click)=`, `[(email)]=`, `?disabled=`, `data-step=`. */
const ATTR = /(?:[@:#?.]?[A-Za-z][\w:.-]*|\[\(?[\w.-]+\)?\]|\([\w.-]+\))(?==)/y;
/** An attribute whose value is code, not text: Vue and Angular bindings. */
const EXPRESSION_ATTR = /^(?:v-|[@:#[(])/;
/** Svelte blocks (`{#if`, `{:else if`, `{/if`) and Angular control flow (`@if`, `@case`). */
const TEMPLATE_KEYWORD =
	/\{[#:/](?:else if|[a-z]+)|@(?:if|else|switch|case|default|for|empty|defer)\b/y;
/** A directive without a value: Vue's `v-else`, Svelte's `bind:email`. */
const BARE_DIRECTIVE = /(?:v-[\w-]+|bind:\w+|on:\w+)(?![\w(])/y;
const COMMENT = /\/\/.*|\/\*.*?\*\/|<!--.*?-->/y;
const STRING = /"[^"]*"|'[^']*'/y;
/** A tag name, right after `<` or `</`. */
const TAG = /(?<=<\/?)[A-Za-z][\w.-]*/y;
const DECORATOR = /@[A-Za-z]\w*/y;
const NUMBER = /\d+(?:\.\d+)?/y;
const WORD = /[A-Za-z_$][\w$]*/y;
/** Runs of syntax; a `/` that starts a comment is left for the comment. */
const PUNCT = /(?:[{}()[\]<>;,.:=`$!?&|+*%-]|\/(?![/*]))+/y;
const SPACE = /\s+/y;

function at(pattern: RegExp, line: string, index: number) {
	pattern.lastIndex = index;
	return pattern.exec(line)?.[0];
}

/** Tried in order at each position; the first that matches wins. */
const RULES: [RegExp, TokenKind | undefined][] = [
	[SPACE, undefined],
	[COMMENT, "comment"],
	[ATTR, "attr"],
	[BARE_DIRECTIVE, "attr"],
	[STRING, "string"],
	[TEMPLATE_KEYWORD, "keyword"],
	[TAG, "tag"],
	[DECORATOR, "tag"],
	[NUMBER, "number"],
	[WORD, undefined],
	[PUNCT, "punct"],
];

/** A name's colour depends on what it is: a keyword, a call, a type, or a name. */
function wordKind(
	word: string,
	before: string,
	rest: string,
): TokenKind | undefined {
	// Text between tags (`<button>Continue</button>`) is content, not code.
	if (/[^=]>$/.test(before)) return undefined;
	// `from` is a keyword in an import, and a plain name in `({ from })`.
	if (KEYWORDS.has(word) && (word !== "from" || /^\s+["']/.test(rest))) {
		return "keyword";
	}
	if (rest[0] === "(" || rest[0] === "`") return "fn";
	if (/^[A-Z]/.test(word)) return "tag";
	return undefined;
}

export function tokenizeLine(line: string): Token[] {
	const out: Token[] = [];
	const push = (text: string, kind?: TokenKind) => {
		const last = out[out.length - 1];
		// Merge runs of plain text so a line renders as few nodes as possible.
		if (!kind && last && !last.kind) last.text += text;
		else out.push({ kind, text });
	};
	// Inside `v-if="..."`: the quotes are syntax and what they hold is code.
	let inExpression = false;
	let i = 0;

	while (i < line.length) {
		if (inExpression && line[i] === '"') {
			inExpression = false;
			push('"', "punct");
			i += 1;
			continue;
		}
		let matched = false;
		for (const [pattern, kind] of RULES) {
			const text = at(pattern, line, i);
			if (!text) continue;
			matched = true;
			const start = i;
			i += text.length;
			if (pattern === WORD) {
				push(text, wordKind(text, line.slice(0, start), line.slice(i)));
			} else {
				push(text, kind);
			}
			if (
				pattern === ATTR &&
				EXPRESSION_ATTR.test(text) &&
				line.startsWith('="', i)
			) {
				push('="', "punct");
				i += 2;
				inExpression = true;
			}
			break;
		}
		if (!matched) {
			push(line[i]);
			i += 1;
		}
	}
	return out;
}

/** Tokenized once per snippet: call it at module scope, not in render. */
export const tokenize = (code: string) => code.split("\n").map(tokenizeLine);

export function Tokens({ tokens }: { tokens: Token[] }): ReactNode {
	if (tokens.length === 0) return " ";
	return tokens.map((token, index) =>
		token.kind ? (
			<span key={index} className={TOKEN_CLASS[token.kind]}>
				{token.text}
			</span>
		) : (
			token.text
		),
	);
}

/** A highlighted block, for snippets without line numbers. */
export function Highlighted({ lines }: { lines: Token[][] }) {
	return lines.map((tokens, index) => (
		<span key={index} className="block">
			<Tokens tokens={tokens} />
		</span>
	));
}

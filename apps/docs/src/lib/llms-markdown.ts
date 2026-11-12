import { SITE } from "@/lib/site";

const attribute = (attrs: string, name: string) =>
	attrs.match(new RegExp(`${name}="([^"]*)"`))?.[1];

const CALLOUT_LABEL: Record<string, string> = {
	warn: "Warning",
	warning: "Warning",
	error: "Warning",
	info: "Note",
};

/**
 * Turns the site's MDX components into plain markdown, outside code fences
 * only: cards become links, callouts become quotes, tabs become labels,
 * check lists become lists, interactive demos are dropped (they only work in
 * the browser), and root-relative links become absolute.
 */
export function toPlainMarkdown(text: string): string {
	const out: string[] = [];
	let fenced = false;
	let quote = false;
	let bullet: string | null = null;
	for (const line of text.split("\n")) {
		if (/^\s*```/.test(line)) fenced = !fenced;
		if (fenced || /^\s*```/.test(line)) {
			out.push(quote ? `> ${line}` : line);
			continue;
		}
		const card = line.match(/^\s*<Card\b([^>]*?)\/>\s*$/);
		if (card) {
			const href = attribute(card[1], "href") ?? "";
			const description = attribute(card[1], "description");
			out.push(
				`- [${attribute(card[1], "title") ?? href}](${href.startsWith("/") ? SITE.url + href : href})${description ? `: ${description}` : ""}`,
			);
			continue;
		}
		const callout = line.match(/^\s*<Callout\b([^>]*)>\s*$/);
		if (callout) {
			const title =
				attribute(callout[1], "title") ??
				CALLOUT_LABEL[attribute(callout[1], "type") ?? "info"] ??
				"Note";
			out.push(`> **${title}**`, ">");
			quote = true;
			continue;
		}
		if (/^\s*<\/Callout>\s*$/.test(line)) {
			quote = false;
			continue;
		}
		const tab = line.match(/^\s*<Tab\s+value="([^"]+)"\s*>\s*$/);
		if (tab) {
			out.push(`**${tab[1]}**`);
			continue;
		}
		const item = line.match(/^\s*<(CheckItem|CrossItem)>\s*$/);
		if (item) {
			bullet = item[1] === "CheckItem" ? "- ✓ " : "- ✗ ";
			continue;
		}
		// Wrappers with no meaning in text, and self-closing demos that only run in the browser.
		if (
			/^\s*<\/?(Cards|Tabs|Tab|Preview|CheckList|CheckItem|CrossItem)\b[^>]*>\s*$/.test(
				line,
			) ||
			/^\s*<[A-Z][A-Za-z]*\b[^>]*\/>\s*$/.test(line)
		)
			continue;
		let next = line.replace(/\]\(\//g, `](${SITE.url}/`);
		if (bullet && next.trim()) {
			next = `${bullet}${next.trim()}`;
			bullet = null;
		}
		out.push(quote ? (next ? `> ${next}` : ">") : next);
	}
	return out
		.join("\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

/**
 * The file to edit for a page, relative to the docs app: the shared file a
 * thin page includes (`<include cwd>content/shared/...</include>`), else the
 * page itself.
 */
export function editableSource(pagePath: string, raw: string): string {
	const shared = raw.match(/<include cwd>(content\/shared\/[^<]+)<\/include>/);
	return shared ? shared[1] : `content/docs/${pagePath}`;
}

/** The name the compiled page exports its editable source under (`page.data._exports`). */
export const EDIT_SOURCE_EXPORT = "editSource";

const DOCS_DIR = "content/docs/";

/**
 * Works out a page's {@link editableSource} while it compiles, from the source
 * as written (before `<include>` is inlined), and exports it with the page.
 *
 * The deployed server has the compiled pages, not the `.mdx` files, so the
 * source can't be read from disk when a page is requested.
 */
export function remarkEditSource() {
	return (
		_tree: unknown,
		file: { path?: string; value: unknown; data: Record<string, unknown> },
	) => {
		const path = file.path?.replaceAll("\\", "/");
		const at = path?.lastIndexOf(DOCS_DIR) ?? -1;
		if (!path || at === -1) return;
		file.data[EDIT_SOURCE_EXPORT] = editableSource(
			path.slice(at + DOCS_DIR.length),
			String(file.value),
		);
	};
}

/** The editable source a compiled page exported, else the page itself. */
export function compiledEditSource(page: {
	path: string;
	data: { _exports?: Record<string, unknown> };
}): string {
	const value = page.data._exports?.[EDIT_SOURCE_EXPORT];
	return typeof value === "string" ? value : `content/docs/${page.path}`;
}

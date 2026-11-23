/**
 * The file to edit for a page, relative to the docs app: the shared file a
 * thin page includes (`<include cwd>content/shared/...</include>`), else the
 * page itself.
 */
export function editableSource(pagePath: string, raw: string): string {
	const shared = raw.match(/<include cwd>(content\/shared\/[^<]+)<\/include>/);
	return shared ? shared[1] : `content/docs/${pagePath}`;
}

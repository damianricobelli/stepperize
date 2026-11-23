// What the tests use from Vite and Node, without pulling in their whole type packages.

/** Vite's `?raw` imports: the file's text. */
declare module "*?raw" {
	const text: string;
	export default text;
}

declare module "node:url" {
	export function fileURLToPath(url: string | URL): string;
}

interface ImportMeta {
	readonly url: string;
}

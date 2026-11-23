// The few Node APIs `dom.cdn.test.ts` uses: the package has no `@types/node`.

declare module "node:module" {
	export function createRequire(path: string | URL): { (id: string): unknown; resolve(id: string): string };
}

declare module "node:url" {
	export function fileURLToPath(url: string | URL): string;
}

declare const process: { env: Record<string, string | undefined> };

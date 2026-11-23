import "@angular/compiler";
import type { Type } from "@angular/core";
import { type BootstrapContext, bootstrapApplication, provideClientHydration } from "@angular/platform-browser";
import { provideServerRendering, renderApplication } from "@angular/platform-server";

/** Render a root component to an HTML document with Angular's server renderer, ready to hydrate. */
export function renderOnServer(component: Type<unknown>, selector: string) {
	return renderApplication(
		(context: BootstrapContext) =>
			bootstrapApplication(component, { providers: [provideServerRendering(), provideClientHydration()] }, context),
		{ document: `<!doctype html><html><head></head><body><${selector}></${selector}></body></html>` },
	);
}

/** For the hydration test, which asks the test server for this page. */
export async function renderPair() {
	const { Pair } = await import("./fixtures");
	return renderOnServer(Pair, "sz-pair");
}

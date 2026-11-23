import "@angular/compiler";
import type { Type } from "@angular/core";
import { type BootstrapContext, bootstrapApplication, provideClientHydration } from "@angular/platform-browser";
import { provideServerRendering, renderApplication } from "@angular/platform-server";

/**
 * Render a root component to an HTML document with Angular's server renderer, ready to hydrate.
 * Pass the early event contract, as the Angular CLI adds it to `index.html`, to have events that
 * happen before hydration recorded and replayed.
 */
export function renderOnServer(component: Type<unknown>, selector: string, contract?: string) {
	const head = contract ? `<script id="ng-event-dispatch-contract">${contract}</script>` : "";
	return renderApplication(
		(context: BootstrapContext) =>
			bootstrapApplication(component, { providers: [provideServerRendering(), provideClientHydration()] }, context),
		{ document: `<!doctype html><html><head>${head}</head><body><${selector}></${selector}></body></html>` },
	);
}

declare module "*.vue" {
	import type { DefineComponent } from "vue";

	const component: DefineComponent;
	export default component;
}

declare module "*.svelte" {
	import type { Component } from "svelte";

	const component: Component;
	export default component;
}

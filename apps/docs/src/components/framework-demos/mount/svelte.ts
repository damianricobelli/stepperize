import { mount as svelteMount, unmount } from "svelte";
import SvelteDemo from "../SvelteDemo.svelte";

export function mount(el: HTMLElement) {
	const app = svelteMount(SvelteDemo, { target: el });
	return () => void unmount(app);
}

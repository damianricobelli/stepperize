<script lang="ts">
import type { Snippet } from "svelte";
import { setIndex } from "./context.svelte";

let { index, children }: { index: number; children: Snippet } = $props();
// One instance per step, keyed by its id: the index of an instance never changes.
// svelte-ignore state_referenced_locally
setIndex(index);
</script>

{@render children()}

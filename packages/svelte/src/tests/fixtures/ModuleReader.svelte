<script lang="ts">
import { read, stepper } from "./module.svelte";

let { seen }: { seen?: (id: string) => void } = $props();
$effect(() => seen?.(stepper.current.id));
</script>

<output>{stepper.current.id} {read()} {stepper.index}</output>

<script lang="ts">
import { flow } from "./flow";

let { seen }: { seen?: (id: string) => void } = $props();
const stepper = flow.useStepperContext();
// Runs again only when what it reads changes.
$effect(() => seen?.(stepper.current.id));
</script>

<output>{stepper.current.id}</output>

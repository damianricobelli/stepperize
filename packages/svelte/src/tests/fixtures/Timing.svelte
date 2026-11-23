<script lang="ts">
import { flow } from "./flow";
import Mover from "./Mover.svelte";

let { tag, seen }: { tag: string; seen: (entry: string) => void } = $props();
const stepper = flow.useStepper(() => {
	// Captured now: only options applied before the child's effect see the new tag.
	const current = tag;
	return { onChange: (snapshot) => seen(`${current}:${snapshot.step}`) };
});
</script>

<Mover {tag} move={() => void stepper.next()} />

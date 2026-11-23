<script lang="ts">
let { tag, move }: { tag: string; move: () => void } = $props();
// A child's effect runs before its parent's: the parent's options must already be current.
$effect(() => {
	if (tag !== "one") move();
});
</script>

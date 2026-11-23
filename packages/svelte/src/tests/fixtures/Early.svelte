<script lang="ts">
let { write }: { write: () => void } = $props();
// A child's effect runs before its parent's.
$effect(() => write());
</script>

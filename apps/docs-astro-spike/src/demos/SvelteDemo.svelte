<script lang="ts">
  import { box, button, createFlow } from './shared';

  const flow = createFlow();
  let s = $state.raw(flow.get());
  $effect(() =>
    flow.subscribe(() => {
      s = flow.get();
    }),
  );
</script>

<div class={box} data-demo="svelte">
  <strong>Svelte</strong>
  <span data-step>{s.index + 1}/{s.steps.length}: {s.current.title}</span>
  <button class={button} disabled={s.isFirst} onclick={() => flow.prev()}>Prev</button>
  <button class={button} disabled={s.isLast} onclick={() => flow.next()}>Next</button>
</div>

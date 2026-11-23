<script setup lang="ts">
import { onMounted, onUnmounted, shallowRef } from 'vue';
import { box, button, createFlow } from './shared';

const flow = createFlow();
const s = shallowRef(flow.get());
let stop: (() => void) | undefined;
onMounted(() => {
  stop = flow.subscribe(() => {
    s.value = flow.get();
  });
});
onUnmounted(() => stop?.());
</script>

<template>
  <div :class="box" data-demo="vue">
    <strong>Vue</strong>
    <span data-step>{{ s.index + 1 }}/{{ s.steps.length }}: {{ s.current.title }}</span>
    <button :class="button" :disabled="s.isFirst" @click="flow.prev()">Prev</button>
    <button :class="button" :disabled="s.isLast" @click="flow.next()">Next</button>
  </div>
</template>

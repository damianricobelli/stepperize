import { createApp } from 'vue';
import VueDemo from '../VueDemo.vue';

export function mount(el: HTMLElement) {
  const app = createApp(VueDemo);
  app.mount(el);
  return () => app.unmount();
}

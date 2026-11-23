import { createComponent, render } from 'solid-js/web';
import SolidDemo from '../solid/SolidDemo';

export function mount(el: HTMLElement) {
  return render(() => createComponent(SolidDemo, {}), el);
}

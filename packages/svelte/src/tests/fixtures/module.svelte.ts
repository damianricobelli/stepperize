import { fromFlow } from "../../lib/index";
import { flow as definition } from "./flow";

// A flow at module scope: no component owns it. Wrapped so the test can count subscriptions.
export const flow = definition.create();
const subscribe = flow.subscribe;
export const listeners = { count: 0 };
flow.subscribe = (listener) => {
	listeners.count++;
	const stop = subscribe(listener);
	return () => {
		listeners.count--;
		stop();
	};
};
export const stepper = fromFlow(flow);
// Module-level derived state follows it too.
const title = $derived(stepper.current.title);
export const read = () => title;

import * as React from "react";
import * as TestUtils from "react-dom/test-utils";

/**
 * `act` is exported by `react` since 18.3, and only by `react-dom/test-utils` before that (where 18.3
 * deprecates it and 19 keeps it as a shim). Take React's own when it has one, so the compat job can
 * test the floor of the peer range, 18.0.0.
 */
type Act = <T>(callback: () => T | Promise<T>) => Promise<T>;
const reactAct = ((React as { act?: unknown }).act ?? (TestUtils as { act?: unknown }).act) as Act;

// Direct hook/root updates need React's act environment. Browser interactions
// use Vitest's native actions instead; restore the previous flag afterwards.
export async function act<T>(callback: () => T | Promise<T>): Promise<T> {
	const environment = globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean };
	const previous = environment.IS_REACT_ACT_ENVIRONMENT;
	environment.IS_REACT_ACT_ENVIRONMENT = true;
	try {
		return await reactAct(callback);
	} finally {
		environment.IS_REACT_ACT_ENVIRONMENT = previous;
	}
}

import { act as reactAct } from "react";

// Direct hook/root updates need React's act environment. Browser interactions
// use Vitest's native actions instead; restore the previous flag afterwards.
export async function act<T>(callback: () => T | Promise<T>): Promise<T> {
	const environment = globalThis as typeof globalThis & {
		IS_REACT_ACT_ENVIRONMENT?: boolean;
	};
	const previous = environment.IS_REACT_ACT_ENVIRONMENT;
	environment.IS_REACT_ACT_ENVIRONMENT = true;
	try {
		return await reactAct(callback);
	} finally {
		environment.IS_REACT_ACT_ENVIRONMENT = previous;
	}
}

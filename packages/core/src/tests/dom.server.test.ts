import { expect, it } from "vitest";

it("can be imported where there is no DOM", async () => {
	expect(typeof document).toBe("undefined");
	const { bindStepper } = await import("../dom");
	expect(typeof bindStepper).toBe("function");
	// The main entry stays free of DOM code: binding is a separate import.
	expect(Object.keys(await import("../index"))).not.toContain("bindStepper");
});

import { describe, expect, it } from "vitest";
import { toPlainMarkdown } from "./llms-markdown";

describe("toPlainMarkdown", () => {
	it("turns site components into markdown and leaves code alone", () => {
		const input = [
			'<InteractiveExample name="intro" />',
			"<Cards>",
			'<Card href="/docs/v8/x" title="Start" description="Begin here." />',
			"</Cards>",
			'<Callout type="warn">',
			"Await the result.",
			"</Callout>",
			'<Tabs items={["pnpm"]}>',
			'<Tab value="pnpm">',
			"```bash",
			"pnpm add @stepperize/react",
			"```",
			"</Tab>",
			"</Tabs>",
			"<CheckItem>",
			"It validates.",
			"</CheckItem>",
			"See [navigation](/docs/v8/guides/navigation).",
			"```tsx",
			"<Stepper.Root />",
			"```",
		].join("\n");
		expect(toPlainMarkdown(input)).toBe(
			[
				"- [Start](https://stepperize.com/docs/v8/x): Begin here.",
				"> **Warning**",
				">",
				"> Await the result.",
				"**pnpm**",
				"```bash",
				"pnpm add @stepperize/react",
				"```",
				"- ✓ It validates.",
				"See [navigation](https://stepperize.com/docs/v8/guides/navigation).",
				"```tsx",
				"<Stepper.Root />",
				"```",
			].join("\n"),
		);
	});
});

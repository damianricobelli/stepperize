import { For, type JSX, splitProps } from "solid-js";
import { defineStepper, type RootProps } from "../index";

export const steps = [
	{ id: "first", title: "First", description: "Start here" },
	{ id: "second", title: "Second", description: "Then this" },
	{ id: "third", title: "Third", description: "Finish" },
] as const;
export const flow = defineStepper(steps);
export const { Stepper } = flow;
export type Api = ReturnType<typeof flow.useStepper>;

/** Every prop goes to the Root. */
export function Full(props: Omit<RootProps<typeof steps>, "children">) {
	return (
		<Stepper.Root {...props}>
			<Stepper.List>
				{() => (
					<Stepper.Item>
						<Stepper.Trigger>
							<Stepper.Indicator />
							<Stepper.Title />
							<Stepper.Description />
						</Stepper.Trigger>
					</Stepper.Item>
				)}
			</Stepper.List>
			<For each={steps}>
				{(step) => (
					<Stepper.Content step={step.id}>
						<label>
							{step.title} name
							<input />
						</label>
					</Stepper.Content>
				)}
			</For>
			<Stepper.Prev>Back</Stepper.Prev>
			<Stepper.Next>Continue</Stepper.Next>
		</Stepper.Root>
	);
}

/** Two steppers on one page, for the server and hydration tests. */
export function Pair() {
	return (
		<>
			<Full snapshot={{ step: "second", complete: ["first"] }} />
			<Full />
		</>
	);
}

/** The root both `renderToString` and `hydrate` are given, so their hydration keys agree. */
export const page = () => <Pair />;

/** A design-system button: it forwards what it receives. */
export function Fancy(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
	const [local, rest] = splitProps(props, ["class"]);
	return <button class={`mine ${local.class ?? ""}`.trim()} {...rest} type="submit" />;
}

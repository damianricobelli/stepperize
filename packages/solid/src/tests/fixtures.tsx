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
				{(_step) => (
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

/** A design-system button: it forwards what it receives. */
export function Fancy(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
	const [local, rest] = splitProps(props, ["class"]);
	return <button class={`mine ${local.class ?? ""}`.trim()} {...rest} type="submit" />;
}

/** A router-style link: a component with its own props that spreads the rest. */
export function Link(props: JSX.AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }) {
	const [local, rest] = splitProps(props, ["to"]);
	return <a href={`#${local.to}`} {...rest} />;
}

/** A Root function child, `as` tags and components, and panels kept mounted. */
export function Extras() {
	return (
		<Stepper.Root aria-label="Extras" data-testid="extras">
			{(stepper) => (
				<>
					<output>{stepper.current.title}</output>
					<Stepper.List as="div">
						{(step) => (
							<Stepper.Item as="div">
								<Stepper.Trigger as={Link} to={step.id}>
									<Stepper.Title />
								</Stepper.Trigger>
							</Stepper.Item>
						)}
					</Stepper.List>
					<For each={steps}>
						{(step) => (
							<Stepper.Content step={step.id} as="section" forceMount>
								{step.title} panel
							</Stepper.Content>
						)}
					</For>
					<Stepper.Next as={Fancy}>Continue</Stepper.Next>
				</>
			)}
		</Stepper.Root>
	);
}

/** A free flow, a linear one resumed mid-way, and the extras: one page for the server and hydration tests. */
export const page = () => (
	<>
		<Full snapshot={{ step: "second", complete: ["first"] }} />
		<Full linear snapshot={{ step: "second", complete: ["first"] }} />
		<Extras />
	</>
);

/** A flow without triggers: the server assumes tabs, the browser switches to groups once mounted. */
export const groups = () => (
	<Stepper.Root>
		<Stepper.List>
			{(_step) => (
				<Stepper.Item>
					<Stepper.Indicator />
					<Stepper.Title />
				</Stepper.Item>
			)}
		</Stepper.List>
		<Stepper.Content step="first">One</Stepper.Content>
	</Stepper.Root>
);

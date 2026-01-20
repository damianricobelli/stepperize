"use client";

import * as React from "react";

import { defineStepper } from "@/registry/new-york/blocks/stepper-demo/components/ui/stepper";
import { Button } from "@/registry/new-york/ui/button";

const { Stepper } = defineStepper(
	{
		id: "step-1",
		title: "Step 1",
	},
	{
		id: "step-2",
		title: "Step 2",
	},
	{
		id: "step-3",
		title: "Step 3",
	},
);

export function StepperDemo() {
	return (
		<Stepper.Provider className="space-y-4" variant="horizontal">
			{({ methods }) => (
				<React.Fragment>
					<Stepper.Navigation>
						{methods.all.map((step) => (
							<Stepper.Step key={step.id} of={step.id} onClick={() => methods.goTo(step.id)}>
								<Stepper.Title>{step.title}</Stepper.Title>
							</Stepper.Step>
						))}
					</Stepper.Navigation>
					{methods.switch({
						"step-1": (step) => <Content id={step.id} />,
						"step-2": (step) => <Content id={step.id} />,
						"step-3": (step) => <Content id={step.id} />,
					})}
					<Stepper.Controls>
						{!methods.isLast && (
							<Button type="button" variant="secondary" onClick={methods.prev} disabled={methods.isFirst}>
								Previous
							</Button>
						)}
						<Button onClick={methods.isLast ? methods.reset : methods.next}>{methods.isLast ? "Reset" : "Next"}</Button>
					</Stepper.Controls>
				</React.Fragment>
			)}
		</Stepper.Provider>
	);
}

const Content = ({ id }: { id: string }) => {
	return (
		<Stepper.Panel className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8">
			<p className="text-xl font-normal">Content for {id}</p>
		</Stepper.Panel>
	);
};

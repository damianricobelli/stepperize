"use client";

import { defineStepper, Get } from "@stepperize/react";
import { useStepItemContext } from "@stepperize/react/primitives";
import { Button } from "@/registry/base-ui/ui/button";
import React from "react";

const { Stepper, ...stepperDefinition } = defineStepper([
	{
		id: "step-1",
		title: "Step 1",
		description: "This is the first step",
	},
	{
		id: "step-2",
		title: "Step 2",
		description: "This is the second step",
	},
	{
		id: "step-3",
		title: "Step 3",
		description: "This is the third step",
	},
]);

const StepperTriggerWrapper = () => {
	const item = useStepItemContext();
	const isInactive = item.status === "inactive";

	return (
		<Stepper.Trigger
			render={(domProps) => (
				<Button
					className="rounded-full"
					variant={isInactive ? "secondary" : "default"}
					size="icon"
					{...domProps}
				>
					<Stepper.Indicator />
				</Button>
			)}
		/>
	);
};

const StepperTitleWrapper = ({ title }: { title: string }) => {
	return (
		<Stepper.Title
			render={(domProps) => (
				<h4 className="text-base font-medium" {...domProps}>
					{title}
				</h4>
			)}
		/>
	);
};

const StepperDescriptionWrapper = ({ description }: { description?: string }) => {
	if (!description) return null;
	return (
		<Stepper.Description
			render={(domProps) => (
				<p className="text-sm text-muted-foreground" {...domProps}>
					{description}
				</p>
			)}
		/>
	);
};

const StepperSeparatorWithStatus = ({
	status,
	isLast,
}: { status: string; isLast: boolean }) => {
	if (isLast) return null;

	return (
		<Stepper.Separator
			orientation="horizontal"
			data-status={status}
			className="bg-muted data-[status=success]:bg-primary data-[disabled]:opacity-50 transition-all duration-300 ease-in-out data-[orientation=horizontal]:h-0.5 data-[orientation=horizontal]:flex-1 data-[orientation=vertical]:h-full data-[orientation=vertical]:w-0.5"
		/>
	);
};

export function StepperWithDescription() {
	return (
		<Stepper.Root className="w-full space-y-4" orientation="horizontal">
			{({ stepper }) => (
				<>
					<Stepper.List
						className="flex gap-2 data-[orientation=horizontal]:flex-row data-[orientation=horizontal]:items-center data-[orientation=horizontal]:justify-between data-[orientation=vertical]:flex-col"
					>
						{stepper.all.map((stepData, index) => {
							const currentIndex = stepper.all.findIndex((s) => s.id === stepper.current.id);
							const status = index < currentIndex ? "success" : index === currentIndex ? "active" : "inactive";
							const isLast = index === stepper.all.length - 1;
							const data = stepData as { id: string; title: string; description?: string };
							return (
								<React.Fragment key={stepData.id}>
									<Stepper.Item
										step={stepData.id}
										className="group peer relative flex items-center gap-2"
									>
										<StepperTriggerWrapper />
										<div className="flex flex-col items-start gap-1">
											<StepperTitleWrapper title={data.title} />
											<StepperDescriptionWrapper
												description={data.description}
											/>
										</div>
									</Stepper.Item>
									<StepperSeparatorWithStatus
										key={`separator-${stepData.id}`}
										status={status}
										isLast={isLast}
									/>
								</React.Fragment>
							);
						})}
					</Stepper.List>
					{stepper.switch({
						"step-1": (data) => <Content id={data.id} />,
						"step-2": (data) => <Content id={data.id} />,
						"step-3": (data) => <Content id={data.id} />,
					})}
					<Stepper.Actions className="flex justify-end gap-4">
						{!stepper.isLast && (
							<Stepper.Prev
								render={(domProps) => (
									<Button
										type="button"
										variant="secondary"
										{...domProps}
									>
										Previous
									</Button>
								)}
							/>
						)}
						{stepper.isLast ? (
							<Button
								type="button"
								onClick={() => stepper.reset()}
							>
								Reset
							</Button>
						) : (
							<Stepper.Next
								render={(domProps) => (
									<Button type="button" {...domProps}>
										Next
									</Button>
								)}
							/>
						)}
					</Stepper.Actions>
				</>
			)}
		</Stepper.Root>
	);
}

const Content = ({
	id,
}: { id: Get.Id<typeof stepperDefinition.steps> }) => {
	return (
		<Stepper.Content
			step={id}
			render={(props) => (
				<div
					{...props}
					className="h-[200px] content-center rounded border bg-secondary text-secondary-foreground p-8"
				>
					<p className="text-xl font-normal">Content for {id}</p>
				</div>
			)}
		/>
	);
};

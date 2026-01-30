"use client";

import { defineStepper, Get } from "@stepperize/react";
import { useStepItemContext } from "@stepperize/react/primitives";

import { Button } from "@/registry/radix-ui/ui/button";

const { Stepper, ...stepperDefinition } = defineStepper([
	{
		id: "step-1",
		title: "Account",
		description: "Create your account",
	},
	{
		id: "step-2",
		title: "Profile",
		description: "Set up your profile",
	},
	{
		id: "step-3",
		title: "Preferences",
		description: "Configure preferences",
	},
	{
		id: "step-4",
		title: "Complete",
		description: "All done!",
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
				<h4 className="text-sm font-medium" {...domProps}>
					{title}
				</h4>
			)}
		/>
	);
};

const StepperDescriptionWrapper = ({
	description,
}: { description?: string }) => {
	if (!description) return null;
	return (
		<Stepper.Description
			render={(domProps) => (
				<p className="text-xs text-muted-foreground" {...domProps}>
					{description}
				</p>
			)}
		/>
	);
};

const StepperSeparatorWithLabelOrientation = ({
	status,
	isLast,
}: { status: string; isLast: boolean }) => {
	if (isLast) return null;

	return (
		<Stepper.Separator
			orientation="horizontal"
			data-status={status}
			className="absolute left-[calc(50%+30px)] right-[calc(-50%+20px)] top-5 block shrink-0 bg-muted data-[status=success]:bg-primary data-[disabled]:opacity-50 transition-all duration-300 ease-in-out h-0.5"
		/>
	);
};

export function StepperWithLabelOrientation() {
	return (
		<Stepper.Root className="w-full space-y-4" orientation="horizontal">
			{({ stepper }) => (
				<>
					<Stepper.List className="flex gap-2 flex-row items-center justify-between">
						{stepper.steps.map((stepInfo, index) => {
							const { status } = stepInfo;
							const isLast = index === stepper.steps.length - 1;
							const stepData = stepInfo.data as {
								id: string;
								title: string;
								description?: string;
							};

							return (
								<Stepper.Item
									key={stepInfo.data.id}
									step={stepInfo.data.id}
									className="group peer relative flex w-full flex-col items-center justify-center gap-2"
								>
									<StepperTriggerWrapper />
									<StepperSeparatorWithLabelOrientation
										status={status}
										isLast={isLast}
									/>
									<div className="flex flex-col items-center text-center gap-1">
										<StepperTitleWrapper
											title={stepData.title}
										/>
										<StepperDescriptionWrapper
											description={stepData.description}
										/>
									</div>
								</Stepper.Item>
							);
						})}
					</Stepper.List>
					{stepper.switch({
						"step-1": (data) => <Content id={data.id} />,
						"step-2": (data) => <Content id={data.id} />,
						"step-3": (data) => <Content id={data.id} />,
						"step-4": (data) => <Content id={data.id} />,
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

const Content = ({ id }: { id: Get.Id<typeof stepperDefinition.steps> }) => {
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

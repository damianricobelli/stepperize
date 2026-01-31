"use client";

import { defineStepper, Get } from "@stepperize/react";
import { useStepItemContext } from "@stepperize/react/primitives";
import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/registry/base-ui/ui/button";
import { Label } from "@/registry/base-ui/ui/label";
import {
	RadioGroup,
	RadioGroupItem,
} from "@/registry/base-ui/ui/radio-group";

type Orientation = "horizontal" | "vertical";
type LabelOrientation = "horizontal" | "vertical";

const { Stepper, ...stepperDefinition } = defineStepper([
	{
		id: "step-1",
		title: "Step 1",
		description: "First step description",
	},
	{
		id: "step-2",
		title: "Step 2",
		description: "Second step description",
	},
	{
		id: "step-3",
		title: "Step 3",
		description: "Third step description",
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

const StepperSeparator = ({
	status,
	isLast,
	orientation,
	labelOrientation,
}: {
	status: string;
	isLast: boolean;
	orientation: Orientation;
	labelOrientation: LabelOrientation;
}) => {
	if (isLast) return null;

	const isVerticalLabel =
		orientation === "horizontal" && labelOrientation === "vertical";

	return (
		<Stepper.Separator
			orientation={orientation}
			data-status={status}
			className={cn(
				"bg-muted data-[status=success]:bg-primary data-[disabled]:opacity-50 transition-all duration-300 ease-in-out",
				orientation === "horizontal" && "h-0.5 flex-1",
				orientation === "vertical" && "w-0.5 h-full",
				isVerticalLabel &&
					"absolute left-[calc(50%+30px)] right-[calc(-50%+20px)] top-5 block shrink-0",
			)}
		/>
	);
};

export function StepperWithVariants() {
	const [orientation, setOrientation] =
		React.useState<Orientation>("horizontal");
	const [labelOrientation, setLabelOrientation] =
		React.useState<LabelOrientation>("horizontal");

	const isVerticalLabel =
		orientation === "horizontal" && labelOrientation === "vertical";

	return (
		<div className="w-full space-y-8">
			{/* Controls */}
			<div className="flex flex-wrap gap-8 p-4 rounded-lg border bg-muted/50 w-max">
				<div className="space-y-2">
					<Label className="text-sm font-medium">Orientation</Label>
					<RadioGroup
						value={orientation}
						onValueChange={(value) =>
							setOrientation(value as Orientation)
						}
						className="flex gap-4"
					>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="horizontal" id="h-orient" />
							<Label htmlFor="h-orient" className="font-normal">
								Horizontal
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="vertical" id="v-orient" />
							<Label htmlFor="v-orient" className="font-normal">
								Vertical
							</Label>
						</div>
					</RadioGroup>
				</div>

				<div className="space-y-2">
					<Label
						className={cn(
							"text-sm font-medium",
							orientation === "vertical" && "text-muted-foreground",
						)}
					>
						Label Orientation
					</Label>
					<RadioGroup
						value={labelOrientation}
						onValueChange={(value) =>
							setLabelOrientation(value as LabelOrientation)
						}
						disabled={orientation === "vertical"}
						className="flex gap-4"
					>
						<div className="flex items-center space-x-2">
							<RadioGroupItem
								value="horizontal"
								id="h-label"
							/>
							<Label
								htmlFor="h-label"
								className={cn(
									"font-normal",
									orientation === "vertical" && "text-muted-foreground",
								)}
							>
								Horizontal
							</Label>
						</div>
						<div className="flex items-center space-x-2">
							<RadioGroupItem value="vertical" id="v-label" />
							<Label
								htmlFor="v-label"
								className={cn(
									"font-normal",
									orientation === "vertical" && "text-muted-foreground",
								)}
							>
								Vertical
							</Label>
						</div>
					</RadioGroup>
				</div>
			</div>

			{/* Stepper */}
			<Stepper.Root
				className="w-full space-y-4"
				orientation={orientation}
			>
				{({ stepper }) => (
					<>
						<Stepper.List
							className={cn(
								"flex gap-2",
								orientation === "horizontal" &&
									"flex-row items-center justify-between",
								orientation === "vertical" && "flex-col",
							)}
						>
							{stepper.steps.map((stepInfo, index) => {
								const { status } = stepInfo;
								const isLast = index === stepper.steps.length - 1;
								const stepData = stepInfo.data;

								if (orientation === "vertical") {
									return (
										<React.Fragment key={stepInfo.data.id}>
											<Stepper.Item
												step={stepInfo.data.id}
												className="group peer relative flex items-center gap-2"
											>
												<StepperTriggerWrapper />
												<div className="flex flex-col items-start gap-1">
													<StepperTitleWrapper
														title={stepData.title}
													/>
													<StepperDescriptionWrapper
														description={
															stepData.description
														}
													/>
												</div>
											</Stepper.Item>
											<div className="flex gap-4">
												{!isLast && (
													<div className="flex justify-center ps-[calc(var(--spacing)*4.5-1px)] self-stretch">
														<StepperSeparator
															status={status}
															isLast={isLast}
															orientation={
																orientation
															}
															labelOrientation={
																labelOrientation
															}
														/>
													</div>
												)}
												<div className="my-3 flex-1 ps-4">
													<Content
														id={
															stepInfo.data
																.id as Get.Id<
																typeof stepperDefinition.steps
															>
														}
													/>
												</div>
											</div>
										</React.Fragment>
									);
								}

								if (isVerticalLabel) {
									return (
										<Stepper.Item
											key={stepInfo.data.id}
											step={stepInfo.data.id}
											className="group peer relative flex w-full flex-col items-center justify-center gap-2"
										>
											<StepperTriggerWrapper />
											<StepperSeparator
												status={status}
												isLast={isLast}
												orientation={orientation}
												labelOrientation={
													labelOrientation
												}
											/>
											<div className="flex flex-col items-center text-center gap-1">
												<StepperTitleWrapper
													title={stepData.title}
												/>
												<StepperDescriptionWrapper
													description={
														stepData.description
													}
												/>
											</div>
										</Stepper.Item>
									);
								}

								// Horizontal with horizontal labels
								return (
									<React.Fragment key={stepInfo.data.id}>
										<Stepper.Item
											key={stepInfo.data.id}
											step={stepInfo.data.id}
											className="group peer relative flex items-center gap-2"
										>
											<StepperTriggerWrapper />
											<div className="flex flex-col items-start gap-1">
												<StepperTitleWrapper
													title={stepData.title}
												/>
												<StepperDescriptionWrapper
													description={
														stepData.description
													}
												/>
											</div>
										</Stepper.Item>
										<StepperSeparator
											key={`separator-${stepInfo.data.id}`}
											status={status}
											isLast={isLast}
											orientation={orientation}
											labelOrientation={labelOrientation}
										/>
									</React.Fragment>
								);
							})}
						</Stepper.List>

						{orientation === "horizontal" &&
							stepper.switch({
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
		</div>
	);
}

const Content = ({ id }: { id: Get.Id<typeof stepperDefinition.steps> }) => {
	return (
		<Stepper.Content
			step={id}
			render={(props) => (
				<div
					{...props}
					className="h-[150px] content-center rounded border bg-secondary text-secondary-foreground p-8"
				>
					<p className="text-xl font-normal">Content for {id}</p>
				</div>
			)}
		/>
	);
};

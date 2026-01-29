"use client";

import { defineStepper, Get } from "@stepperize/react";
import { useStepItemContext } from "@stepperize/react/primitives";
import * as React from "react";

import { Button } from "@/registry/new-york/ui/button";

const { Stepper, ...stepperDefinition } = defineStepper([
	{
		id: "introduction",
		title: "Introduction",
		description: "Welcome to the tutorial",
	},
	{
		id: "basics",
		title: "Basics",
		description: "Learn the fundamentals",
	},
	{
		id: "advanced",
		title: "Advanced",
		description: "Deep dive into advanced topics",
	},
	{
		id: "practice",
		title: "Practice",
		description: "Apply what you learned",
	},
	{
		id: "certification",
		title: "Certification",
		description: "Get your certificate",
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

const StepperDescriptionWrapper = ({
	description,
}: { description?: string }) => {
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

const StepperSeparatorVertical = ({
	status,
	isLast,
}: { status: string; isLast: boolean }) => {
	if (isLast) return null;

	return (
		<div className="flex justify-center ps-[calc(var(--spacing)*4.5-1px)] self-stretch">
			<Stepper.Separator
				orientation="vertical"
				data-status={status}
				className="w-0.5 h-full bg-muted data-[status=success]:bg-primary transition-all duration-300 ease-in-out"
			/>
		</div>
	);
};

export function StepperWithScrollTracking() {
	return (
		<div className="h-[500px] overflow-y-auto rounded-lg border p-4">
			<Stepper.Root
				className="w-full space-y-4"
				orientation="vertical"
			>
				{({ stepper }) => (
					<>
						<Stepper.List className="flex flex-col">
							{stepper.steps.map((stepInfo, index) => {
								const { status } = stepInfo;
								const isLast =
									index === stepper.steps.length - 1;
								const stepData = stepInfo.data as {
									id: string;
									title: string;
									description?: string;
								};

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
											<StepperSeparatorVertical
												status={status}
												isLast={isLast}
											/>
											<div className="flex-1 ps-4 py-2">
												<ContentWithTracking
													id={
														stepInfo.data
															.id as Get.Id<
															typeof stepperDefinition.steps
														>
													}
													isActive={
														status === "active"
													}
												/>
											</div>
										</div>
									</React.Fragment>
								);
							})}
						</Stepper.List>
						<Stepper.Actions className="flex justify-end gap-4 sticky bottom-0 bg-background py-4">
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
									Start Over
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

const ContentWithTracking = ({
	id,
	isActive,
}: { id: Get.Id<typeof stepperDefinition.steps>; isActive: boolean }) => {
	const ref = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (isActive && ref.current) {
			ref.current.scrollIntoView({ behavior: "smooth", block: "center" });
		}
	}, [isActive]);

	const contentMap: Record<string, { title: string; content: string }> = {
		introduction: {
			title: "Welcome!",
			content:
				"This tutorial will guide you through the basics and advanced concepts. Take your time to understand each section before moving on.",
		},
		basics: {
			title: "Fundamental Concepts",
			content:
				"In this section, we cover the core concepts that form the foundation of everything else. Make sure you understand these before proceeding.",
		},
		advanced: {
			title: "Advanced Topics",
			content:
				"Now that you understand the basics, let's dive into more complex scenarios and edge cases that you might encounter.",
		},
		practice: {
			title: "Hands-on Practice",
			content:
				"Time to apply what you've learned! Complete the exercises below to solidify your understanding.",
		},
		certification: {
			title: "Congratulations!",
			content:
				"You've completed all the modules. Your certificate is now ready for download.",
		},
	};

	const content = contentMap[id];

	return (
		<Stepper.Content
			step={id}
			render={(props) => (
				<div
					ref={ref}
					{...props}
					className="min-h-[150px] rounded border bg-secondary text-secondary-foreground p-6 transition-all duration-300"
				>
					<p className="text-lg font-medium">{content.title}</p>
					<p className="text-sm text-muted-foreground mt-2">
						{content.content}
					</p>
				</div>
			)}
		/>
	);
};

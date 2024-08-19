import type {
	StepperContextType as CoreStepperContextType,
	StepperProps as CoreStepperProps,
	Step,
	StepWithAttr,
} from "@stepperize/core";

export interface StepperContextType<
	Steps extends readonly Step[],
	Metadata extends Record<string, any>,
> extends CoreStepperContextType<Steps, Metadata> {
	when: (id: Steps[number]["id"]) => {
		render: (
			fn: (step: StepWithAttr<Step>) => React.ReactNode,
		) => React.ReactNode | null;
	};
}

export interface StepperProps<
	Steps extends readonly Step[],
	Metadata extends Record<string, any>,
> extends CoreStepperProps<Steps, Metadata> {
	children: React.ReactNode;
}

export type { Step } from "@stepperize/core";

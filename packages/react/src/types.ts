type IconType = React.ComponentType<any> | undefined;

export type Step = {
	id: string;
	title?: string;
	description?: string;
	isOptional?: boolean;
	isDisabled?: boolean;
	icon?: IconType;
};

export type StepWithAttr<T extends Step> = T & {
	dataAttr: {
		"data-step": string;
		"data-disabled": boolean;
		"data-optional": boolean;
		"data-completed": boolean;
		"data-active": boolean;
		"data-last": boolean;
	};
	ariaAttr: {
		role: string;
		"aria-disabled": boolean;
		"aria-selected": boolean;
		"aria-controls": string;
		"aria-label": string;
		"aria-current": string | undefined;
		"aria-posinset": number;
		"aria-setsize": number;
		"aria-labelledby": string;
		"aria-describedby": string;
		"aria-expanded": boolean;
	};
};

export type StepperContextType<
	Steps extends readonly Step[],
	Metadata extends Record<string, any>,
> = {
	steps: Steps;
	metadata?: Metadata;
	onChangeMetadata?: (metadata: Metadata) => void;
	currentStep: Steps[number];
	isLastStep: boolean;
	isFirstStep: boolean;
	goToNextStep: () => void;
	goToPrevStep: () => void;
	goToStep: (id: Steps[number]["id"]) => void;
	getStepById: (id: Steps[number]["id"]) => Step;
	reset: () => void;
	when: (id: Steps[number]["id"]) => {
		render: (
			fn: (step: StepWithAttr<Step>) => React.ReactNode,
		) => React.ReactNode | null;
	};
};

export type StepperProps<
	Steps extends readonly Step[],
	Metadata extends Record<string, any>,
> = {
	steps: Steps;
	initialStep?: Steps[number]["id"];
	expandable?: boolean;
	metadata?: Metadata;
	onChangeMetadata?: (metadata: Metadata) => void;
	onBeforeStepChange?: (
		currentStep: Steps[number],
		nextStep: Steps[number],
	) => boolean;
	onAfterStepChange?: (
		currentStep: Steps[number],
		nextStep: Steps[number],
	) => void;
	children: React.ReactNode;
};

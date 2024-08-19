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
	Steps extends Step[],
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
	getStepById: <Id extends Util.Ids<Steps>>(id: Id) => Util.StepById<Id, Steps>;
	reset: () => void;
	when: <Id extends Util.Ids<Steps>>(id: Id) => {
		render: (
			fn: (step: StepWithAttr<Util.StepById<Id, Steps>>) => React.ReactNode,
		) => React.ReactNode;
	};
};

export type StepperProps<
	Steps extends Step[],
	Metadata extends Record<string, any>,
> = {
	steps: Steps;
	initialStep?: Steps[number]["id"];
	initialState?: "";
	expandable?: boolean;
	metadata?: Metadata;
	onChangeMetadata?: (metadata: Metadata) => void;
	onBeforeStepChange?: (
		currentStep: Steps[number],
		nextStep: Steps[number],
	) => boolean | Promise<boolean>;
	onAfterStepChange?: (
		currentStep: Steps[number],
		nextStep: Steps[number],
	) => void | Promise<void>;
	children: React.ReactNode;
};

export namespace Util {
	/** Returns a union of possible IDs from the given Steps. */
	export type Ids<Steps extends Step[]> = Steps[number]['id']

	/** Returns a Step with the given Id from the given Steps. */
	export type StepById<Id extends Steps[number]['id'], Steps extends Step[]> = Extract<Steps, { id: Id }>
}

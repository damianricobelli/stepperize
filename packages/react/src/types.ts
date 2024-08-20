export type Step = { id: string } & Record<string, any>;

export type Stepper<Steps extends Step[] = Step[]> = {
	all: Steps;
	current: Steps[number];
	isLast: boolean;
	isFirst: boolean;
	get: <Id extends Get.Id<Steps>>(id: Id) => Get.StepById<Steps, Id>;
	next: () => void;
	prev: () => void;
	goTo: (id: Get.Id<Steps>) => void;
	reset: () => void;
	when: <Id extends Get.Id<Steps>, R1, R2>(
		id: Id,
		whenFn: (step: Get.StepById<Steps, Id>) => R1,
		elseFn?: (step: Get.StepSansId<Steps, Id>) => R2,
	) => R1 | R2;
	switch: <R>(when: Get.Switch<Steps, R>) => R;
};

export namespace Get {
	/** Returns a union of possible IDs from the given Steps. */
	export type Id<Steps extends Step[] = Step[]> = Steps[number]["id"];

	/** Returns a Step from the given Steps with the given Step Id. */
	export type StepById<Steps extends Step[], Id extends Get.Id<Steps>> = Extract<Steps[number], { id: Id }>;

	/** Returns any Steps from the given Steps without the given Step Id. */
	export type StepSansId<Steps extends Step[], Id extends Get.Id<Steps>> = Exclude<Steps[number], { id: Id }>;

	/** Returns any Steps from the given Steps without the given Step Id. */
	export type Switch<Steps extends Step[], R> = {
		[Id in Get.Id<Steps>]?: (step: Get.StepById<Steps, Id>) => R;
	};
}

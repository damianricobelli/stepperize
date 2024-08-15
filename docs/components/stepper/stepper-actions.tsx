import * as React from "react";

import { useStepper } from "@stepperize/react";
import { Button } from "../ui/button";

export const StepperActions = () => {
	const {
		isLastStep,
		isOptionalStep,
		goToNextStep,
		goToPrevStep,
		canGoToNextStep,
		canGoToPrevStep,
		reset,
		isStepperFinished,
	} = useStepper();

	return (
		<React.Fragment>
			{isStepperFinished && (
				<div className="h-40 w-full flex items-center justify-center border bg-secondary text-primary rounded-md">
					<h1 className="text-xl">Woohoo! All steps completed! 🎉</h1>
				</div>
			)}
			<div className="w-full flex justify-end gap-2">
				{isStepperFinished ? (
					<Button type="button" onClick={reset}>
						Reset
					</Button>
				) : (
					<>
						<Button
							variant="ghost"
							disabled={!canGoToPrevStep}
							onClick={goToPrevStep}
						>
							Prev
						</Button>
						<Button disabled={!canGoToNextStep} onClick={goToNextStep}>
							{isLastStep ? "Finish" : isOptionalStep ? "Skip" : "Next"}
						</Button>
					</>
				)}
			</div>
		</React.Fragment>
	);
};

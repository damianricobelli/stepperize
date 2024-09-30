"use client";

import {} from "framer-motion";
import { CheckCircle, Code, Layers, Zap } from "lucide-react";
import * as React from "react";

const steps = [
	{
		title: "Install the Package",
		description: "Add @stepperize/react to your project using npm or yarn.",
		code: "npm install @stepperize/react",
		icon: Zap,
	},
	{
		title: "Import the Function",
		description: "Bring the defineStepper function into your component file.",
		code: "import { defineStepper } from '@stepperize/react';",
		icon: Code,
	},
	{
		title: "Define your Stepper",
		description: "Use defineStepper to set up your step sequence.",
		code: `const Stepper = defineStepper(
  { id: 'first', title: 'First' },
  { id: 'second', title: 'Second' },
  { id: 'third', title: 'Third' },
  { id: 'last', title: 'Last' }
);`,
		icon: Layers,
	},
	{
		title: "Implement in Your UI",
		description: "Use the Stepper component in your Component and add your custom logic.",
		code: "// Integrate Stepper with your UI and add custom behavior",
		icon: CheckCircle,
	},
];

export function HowItWorks() {
	return (
		<section className="relative overflow-hidden">
			<div className="container relative z-10">
				<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl mb-12">How It Works</h2>
				<div>
					{steps.map((step, index) => {
						return (
							<div key={index} className="mb-12 last:mb-0">
								<div className="flex items-start">
									<div className="flex-shrink-0 mr-4">
										<div className="size-12 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
											{React.createElement(step.icon, { className: "size-6" })}
										</div>
									</div>
									<div className="flex-grow">
										<h3 className="text-2xl font-semibold mb-2">{step.title}</h3>
										<p className="text-muted-foreground mb-4">{step.description}</p>
										<div className="bg-muted p-4 rounded-lg">
											<pre className="text-sm whitespace-pre-wrap break-words">
												<code>{step.code}</code>
											</pre>
										</div>
									</div>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

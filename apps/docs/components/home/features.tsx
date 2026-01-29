"use client";

import { cn } from "@/lib/cn";
import { Code, ExternalLink, Layers, Package, Puzzle, Zap } from "lucide-react";

const features = [
	{
		icon: Code,
		title: "Minimal API",
		description: "defineStepper + useStepper. No boilerplate.",
	},
	{
		icon: Layers,
		title: "UI agnostic",
		description: "Use any components. Works with any form library.",
	},
	{
		icon: Zap,
		title: "Lightweight & type-safe",
		description: "Zero deps, small bundle, full TypeScript.",
	},
	{
		icon: ExternalLink,
		title: "Open in v0",
		description: "Open any stepper in v0.dev from the docs to edit and remix with AI.",
	},
	{
		icon: Package,
		title: "shadcn/ui compatible",
		description: "Designed to work with shadcn/ui. Copy-paste and go.",
	},
	{
		icon: Puzzle,
		title: "Headless primitives",
		description: "Build accessible stepper UIs your way.",
	},
];

const Features = ({ className }: { className?: string }) => {
	return (
		<section id="features" className={cn("px-4 sm:px-6 lg:px-8 py-20", className)}>
			<div className="max-w-4xl mx-auto">
				<h2 className="text-2xl font-semibold text-gray-12 mb-2 text-center">Why Stepperize</h2>
				<p className="text-gray-11 text-center mb-12">Everything you need, nothing you don't.</p>

				<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
					{features.map(({ icon: Icon, title, description }) => (
						<div
							key={title}
							className="p-5 rounded-xl border border-gray-6 bg-gray-2/50 hover:border-gray-7 transition-colors"
						>
							<div className="size-10 rounded-lg bg-indigo-3 border border-indigo-6 flex items-center justify-center mb-3">
								<Icon className="size-5 text-indigo-11" />
							</div>
							<h3 className="font-medium text-gray-12 mb-1">{title}</h3>
							<p className="text-sm text-gray-11">{description}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
};

export default Features;

import {
	Boxes,
	Expand,
	type LucideIcon,
	Paintbrush,
	Palette,
	ShieldCheck,
	TreePine,
} from "lucide-react";

const features = [
	{
		title: "Lightweight",
		description: "It's only 5kb in size and has no dependencies.",
		icon: Expand,
	},
	{
		title: "Typesafe",
		description: "It's built with TypeScript and provides incredible DX",
		icon: ShieldCheck,
	},
	{
		title: "Customizable",
		description: "You can customize the stepper to match your design system.",
		icon: Paintbrush,
	},
	{
		title: "Shadcn UI ready",
		description: "The docs provide a Shadcn/UI ready example.",
		icon: Palette,
	},
	{
		title: "Tree shakable",
		description: "You only import what you need. No more, no less.",
		icon: TreePine,
	},
	{
		title: "Scalable",
		description:
			"Provides a set of primitives that you can use to build your own stepper component.",
		icon: Boxes,
	},
];

function Feature({
	title,
	description,
	icon,
}: { title: string; description: string; icon: LucideIcon }) {
	const Icon = icon;
	return (
		<div className="flex flex-col gap-4 bg-gray-3 rounded-lg p-5 transform transition duration-300 hover:scale-105">
			<div className="size-12 bg-gray-5 rounded-full flex items-center justify-center">
				<Icon className="size-6 text-gray-11" />
			</div>
			<div className="flex flex-col gap-2">
				<h3 className="text-lg text-gray-12 font-bold">{title}</h3>
				<p className="text-sm text-gray-11">{description}</p>
			</div>
		</div>
	);
}

export function Features() {
	return features.map((feature, index) => <Feature key={index} {...feature} />);
}

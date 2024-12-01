import { icons } from "@/components/icons";
import react from "../../../packages/react/package.json";
import solid from "../../../packages/solid/package.json";
import svelte from "../../../packages/svelte/package.json";
import vue from "../../../packages/vue/package.json";

export interface Mode {
	param: string;
	name: string;
	package: string;
	description?: string;
	version: string;
	icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

export const modes: Mode[] = [
	{
		param: "react",
		name: "React",
		package: react.name,
		description: "Stepperize for React",
		version: react.version,
		icon: icons.ReactIcon,
	},
	{
		param: "vue",
		name: "Vue",
		package: vue.name,
		description: "Stepperize for Vue",
		version: vue.version,
		icon: icons.VueIcon,
	},
	{
		param: "solid",
		name: "Solid",
		package: solid.name,
		description: "Stepperize for Solid",
		version: solid.version,
		icon: icons.SolidIcon,
	},
	{
		param: "svelte",
		name: "Svelte",
		package: svelte.name,
		description: "Stepperize for Svelte",
		version: svelte.version,
		icon: icons.SvelteIcon,
	},
];

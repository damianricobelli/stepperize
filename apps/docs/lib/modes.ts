import {
	AngularIcon,
	LitIcon,
	QwikIcon,
	ReactIcon,
	SolidIcon,
	SvelteIcon,
	VanillaIcon,
	VueIcon,
} from "@/components/icons";
import angular from "../../../packages/angular/package.json";
import lit from "../../../packages/lit/package.json";
import qwik from "../../../packages/qwik/package.json";
import react from "../../../packages/react/package.json";
import solid from "../../../packages/solid/package.json";
import svelte from "../../../packages/svelte/package.json";
import vanilla from "../../../packages/vanilla/package.json";
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
		icon: ReactIcon,
	},
	{
		param: "vue",
		name: "Vue",
		package: vue.name,
		description: "Stepperize for Vue",
		version: vue.version,
		icon: VueIcon,
	},
	{
		param: "angular",
		name: "Angular",
		package: angular.name,
		description: "Stepperize for Angular",
		version: angular.version,
		icon: AngularIcon,
	},
	{
		param: "solid",
		name: "Solid",
		package: solid.name,
		description: "Stepperize for Solid",
		version: solid.version,
		icon: SolidIcon,
	},
	{
		param: "lit",
		name: "Lit",
		package: lit.name,
		description: "Stepperize for Lit",
		version: lit.version,
		icon: LitIcon,
	},
	{
		param: "svelte",
		name: "Svelte",
		package: svelte.name,
		description: "Stepperize for Svelte",
		version: svelte.version,
		icon: SvelteIcon,
	},
	{
		param: "qwik",
		name: "Qwik",
		package: qwik.name,
		description: "Stepperize for Qwik",
		version: qwik.version,
		icon: QwikIcon,
	},
	{
		param: "vanilla",
		name: "Vanilla",
		package: vanilla.name,
		description: "Stepperize for Vanilla JS",
		version: vanilla.version,
		icon: VanillaIcon,
	},
];

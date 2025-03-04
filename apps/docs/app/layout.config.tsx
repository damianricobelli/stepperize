import { icons } from "@/components/icons";

import type { LinkItemType } from "fumadocs-ui/layouts/links";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Waypoints } from "lucide-react";

export const linkItems: LinkItemType[] = [
  {
    icon: <icons.ReactIcon />,
    text: "React",
    url: "/docs/react",
    active: "nested-url",
    description: "Stepperize for React",
  },
  {
    icon: <icons.VueIcon />,
    text: "Vue",
    url: "/docs/vue",
    active: "nested-url",
    description: "Stepperize for Vue",
  },
  {
    icon: <icons.SolidIcon />,
    text: "Solid",
    url: "/docs/solid",
    active: "nested-url",
    description: "Stepperize for Solid",
  },
  {
    icon: <icons.SvelteIcon />,
    text: "Svelte",
    url: "/docs/svelte",
    active: "nested-url",
    description: "Stepperize for Svelte",
  },
];

export const baseOptions: BaseLayoutProps = {
  githubUrl: "https://github.com/damianricobelli/stepperize",
  nav: {
    title: (
      <div className="flex items-center gap-2 text-lg">
        <Waypoints fill="currentColor" />
        <span className="hidden md:block">Stepperize</span>
      </div>
    ),
    transparentMode: "top",
  },
  links: [...linkItems],
};

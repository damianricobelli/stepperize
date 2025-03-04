import { baseOptions } from "@/app/layout.config";
import { icons } from "@/components/icons";
import { source } from "@/lib/source";
import { RootToggle } from "fumadocs-ui/components/layout/root-toggle";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";

interface Mode {
  param: string;
  name: string;
  description?: string;
  icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

const modes: Mode[] = [
  {
    param: "react",
    name: "React",
    description: "Stepperize for React",
    icon: icons.ReactIcon,
  },
  {
    param: "vue",
    name: "Vue",
    description: "Stepperize for Vue",
    icon: icons.VueIcon,
  },
  {
    param: "solid",
    name: "Solid",
    description: "Stepperize for Solid",
    icon: icons.SolidIcon,
  },
  {
    param: "svelte",
    name: "Svelte",
    description: "Stepperize for Svelte",
    icon: icons.SvelteIcon,
  },
];

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      {...baseOptions}
      links={[]}
      tree={source.pageTree}
      sidebar={{
        tabs: false,
        banner: (
          <RootToggle
            className="flex flex-row items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fd-accent/50 hover:text-fd-accent-foreground -mx-2"
            options={modes.map((mode) => ({
              url: `/docs/${mode.param}`,
              icon: <mode.icon className="shrink-0 rounded-md p-1.5" />,
              title: mode.name,
              description: mode.description,
            }))}
          />
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}

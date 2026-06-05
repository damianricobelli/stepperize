import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { Waypoints } from "lucide-react";

export function baseOptions(): BaseLayoutProps {
  return {
    githubUrl: "https://github.com/damianricobelli/stepperize",
    nav: {
      title: (
        <div className="flex items-center gap-2 text-lg">
          <Waypoints className="size-5" />
          <span className="hidden md:block">Stepperize</span>
        </div>
      ),
      transparentMode: "top",
      url: "/",
    },
    searchToggle: {
      full: {
        className: "w-full whitespace-nowrap",
      },
    },
  };
}

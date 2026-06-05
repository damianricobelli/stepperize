"use client";

import { Link } from "@tanstack/react-router";
import { Moon, Sun, Waypoints } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { GitHubMark } from "@/components/landing/shared";
import { HeaderStars } from "@/components/landing/social-proof";
import { cn } from "@/lib/utils";

const GITHUB = "https://github.com/damianricobelli/stepperize";

type NavTarget = "docs" | "blocks";

/**
 * Shared top navigation for the marketing surfaces (landing + Blocks gallery).
 * Keeps the homepage and `/blocks` in visual lockstep — same chrome, same
 * affordances — while `active` highlights the current section.
 */
export function SiteHeader({ active }: { active?: NavTarget }) {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 font-heading text-base font-semibold"
        >
          <Waypoints className="size-5 text-primary" aria-hidden />
          Stepperize
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/docs/$"
            params={{ _splat: "latest" }}
            aria-current={active === "docs" ? "page" : undefined}
            className={cn(
              "hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground sm:block",
              active === "docs" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Docs
          </Link>
          <Link
            to="/blocks"
            aria-current={active === "blocks" ? "page" : undefined}
            className={cn(
              "hidden rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:text-foreground sm:block",
              active === "blocks" ? "text-foreground" : "text-muted-foreground",
            )}
          >
            Blocks
          </Link>
          <HeaderStars />
          <a
            href={GITHUB}
            target="_blank"
            rel="noreferrer noopener"
            aria-label="Stepperize on GitHub"
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground sm:hidden"
          >
            <GitHubMark className="size-5" />
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground"
    >
      {mounted && isDark ? (
        <Sun className="size-5" />
      ) : (
        <Moon className="size-5" />
      )}
    </button>
  );
}

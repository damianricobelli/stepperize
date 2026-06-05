"use client";

import { Download, Scale, Star, Zap } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GitHubMark } from "./shared";
import { formatCompact, formatKb, useStepperizeStats } from "./stats";

const GITHUB = "https://github.com/damianricobelli/stepperize";

/**
 * Compact star count for the header. Links to the repo and shows the live
 * count when known. The star icon nudges the click that grows the number.
 */
export function HeaderStars() {
  const { stars } = useStepperizeStats();
  return (
    <a
      href={GITHUB}
      target="_blank"
      rel="noreferrer noopener"
      aria-label="Star Stepperize on GitHub"
      className="hidden items-center gap-1.5 rounded-lg border bg-card/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
    >
      <GitHubMark className="size-4" />
      <Star className="size-3.5 text-amber-500" aria-hidden />
      <span className="tabular-nums">
        {stars != null ? formatCompact(stars) : "Star"}
      </span>
    </a>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
      <span className="text-primary" aria-hidden>
        {icon}
      </span>
      <span className="font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span>{label}</span>
    </span>
  );
}

/**
 * Above-the-fold trust bar. Live numbers (stars, downloads, bundle size) sit
 * next to static facts (version, zero deps) so a first-time visitor can answer
 * "can I trust this?" without leaving for GitHub or npm. Live values degrade to
 * static copy when a fetch fails, so the bar is never empty or misleading.
 */
export function StatBar({ className }: { className?: string }) {
  const { stars, downloads, gzip } = useStepperizeStats();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground",
        className,
      )}
    >
      <a
        href={GITHUB}
        target="_blank"
        rel="noreferrer noopener"
        className="transition-colors hover:text-foreground"
      >
        <Stat
          icon={<Star className="size-3.5" />}
          value={stars != null ? formatCompact(stars) : "★"}
          label="GitHub stars"
        />
      </a>
      <a
        href={`https://www.npmjs.com/package/@stepperize/react`}
        target="_blank"
        rel="noreferrer noopener"
        className="transition-colors hover:text-foreground"
      >
        <Stat
          icon={<Download className="size-3.5" />}
          value={downloads != null ? `${formatCompact(downloads)}/mo` : "npm"}
          label="downloads"
        />
      </a>
      <Stat
        icon={<Scale className="size-3.5" />}
        value={gzip != null ? formatKb(gzip) : "Tiny"}
        label="gzipped"
      />
      <Stat
        icon={<Zap className="size-3.5" />}
        value="Zero"
        label="dependencies"
      />
    </div>
  );
}

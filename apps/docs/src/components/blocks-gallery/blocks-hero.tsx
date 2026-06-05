"use client";

import { ArrowRight, Blocks, Boxes, ExternalLink } from "lucide-react";
import { BLOCKS, CATEGORIES, REGISTRY_BASE } from "@/lib/blocks";

/**
 * Homepage-grade hero for the Blocks gallery — gradient headline, ambient glow,
 * dotted grid, and the three primary CTAs (browse, registry, learn).
 */
export function BlocksHero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        aria-hidden
        className="lp-glow pointer-events-none absolute -top-40 left-1/2 h-112 w-3xl -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-24 inset-y-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px] mask-[radial-gradient(ellipse_85%_70%_at_50%_0%,black,transparent)]"
      />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <span
            className="lp-rise inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur"
            style={{ animationDelay: "0ms" }}
          >
            <Blocks className="size-3.5 text-primary" aria-hidden />
            {BLOCKS.length} blocks · {CATEGORIES.length} categories ·
            shadcn-ready
          </span>

          <h1
            className="lp-rise mt-6 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl"
            style={{ animationDelay: "80ms" }}
          >
            Production-ready{" "}
            <span className="bg-linear-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              stepper blocks
            </span>
          </h1>

          <p
            className="lp-rise mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg"
            style={{ animationDelay: "160ms" }}
          >
            Complete, accessible, customizable stepper flows built with
            Stepperize and shadcn/ui. Preview them live, inspect the code, open
            them in v0, or install them straight from the registry.
          </p>

          <div
            className="lp-rise mt-8 flex flex-wrap items-center justify-center gap-3"
            style={{ animationDelay: "240ms" }}
          >
            <a
              href="#gallery"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Browse blocks
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <a
              href={`${REGISTRY_BASE}/r/registry.json`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Boxes className="size-4" aria-hidden />
              View registry
              <ExternalLink
                className="size-3.5 text-muted-foreground"
                aria-hidden
              />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

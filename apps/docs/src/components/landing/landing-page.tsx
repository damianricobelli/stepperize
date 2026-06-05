"use client";

import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Blocks,
  Check,
  Combine,
  Component,
  FileText,
  GitBranch,
  Layers,
  Loader2,
  Paintbrush,
  ShieldCheck,
  Sparkles,
  UserPlus,
  Wand2,
  Workflow,
} from "lucide-react";
import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { cn } from "@/lib/utils";
import { AiWorkflowBlock } from "../blocks/ai-workflow";
import { ApprovalFlowBlock } from "../blocks/approval-flow";
import { ApprovalTimelineBlock } from "../blocks/approval-timeline";
import { AsyncProvisioningBlock } from "../blocks/async-provisioning";
import { ConditionalOnboardingBlock } from "../blocks/conditional-onboarding";
import { ValidatedCheckoutBlock } from "../blocks/validated-checkout";
import { BeforeAfter } from "./before-after";
import { CodePreview } from "./code-preview";
import { HeroStepper } from "./hero-stepper";
import { InstallTabs } from "./install-tabs";
import { Code, Eyebrow, GitHubMark, Section } from "./shared";
import { StatBar } from "./social-proof";
import { TypeSafetyProof } from "./type-safety";

const GITHUB = "https://github.com/damianricobelli/stepperize";

export function LandingPage() {
  const links = buildLinks();

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <SiteHeader />
      <main className="flex-1">
        <Hero links={links} />
        <BeforeAfter />
        <EngineProof />
        <TypeSafetyProof />
        <ApiShowcase links={links} />
        <MentalModel />
        <Features />
        <OwnYourUi links={links} />
        <FinalCta links={links} />
      </main>
      <SiteFooter />
    </div>
  );
}

type Links = ReturnType<typeof buildLinks>;

/**
 * Doc links are stored as the splat suffix after `/docs/` so they can be
 * fed to the TanStack Router `Link` for instant, client-side navigation — no
 * full-page reload, matching the docs' own behavior.
 */
function buildLinks() {
  return {
    getStarted: "latest/getting-started/installation",
    instance: "latest/core-concepts/stepper-instance",
    primitives: "latest/guides/primitives",
    github: GITHUB,
  };
}

/** Client-side router link into the docs (SPA navigation, no reload). */
function DocLink({
  to,
  className,
  children,
}: {
  to: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to="/docs/$" params={{ _splat: to }} className={className}>
      {children}
    </Link>
  );
}

/* ──────────────────────────────── Hero ──────────────────────────────── */

function Hero({ links }: { links: Links }) {
  return (
    <section className="relative overflow-hidden">
      {/* ambient glow */}
      <div
        aria-hidden
        className="lp-glow pointer-events-none absolute -top-40 left-1/2 h-112 w-3xl -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      {/* dotted grid with fade mask */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[18px_18px] mask-[radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
      />

      <div className="relative mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 lg:grid-cols-[1.15fr_0.85fr] sm:px-6 lg:items-center lg:py-24">
        <div className="lp-rise" style={{ animationDelay: "0ms" }}>
          <Link
            to="/blocks"
            className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
          >
            <Sparkles className="size-3.5 text-primary" aria-hidden />
            shadcn-ready · copy-paste blocks
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>

          <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            The{" "}
            <span className="bg-linear-to-r from-primary to-violet-500 bg-clip-text text-transparent">
              type-safe
            </span>{" "}
            way to build multi-step experiences in React.
          </h1>

          <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
            Define your steps once and get a fully-typed stepper — navigation,
            validation guards, branching, and async transitions included.
            Headless, so the UI stays yours.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <DocLink
              to={links.getStarted}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get started
              <ArrowRight className="size-4" aria-hidden />
            </DocLink>
            <Link
              to="/blocks"
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              View blocks
            </Link>
            <a
              href={links.github}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <GitHubMark className="size-4" />
              GitHub
            </a>
          </div>

          <div className="mt-6">
            <InstallTabs />
          </div>

          <StatBar className="mt-6" />
        </div>

        <div className="lp-rise" style={{ animationDelay: "120ms" }}>
          <div className="lp-float">
            <HeroStepper />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────── Engine proof ───────────────────────────── */

function EngineProof() {
  const proofs = [
    {
      icon: ShieldCheck,
      label: "Validation that blocks",
      body: "A failed schema check makes the guard return false — the transition is cancelled, not just frowned upon.",
      node: <ValidatedCheckoutBlock />,
    },
    {
      icon: GitBranch,
      label: "Branching paths",
      body: "An earlier answer rewrites the path. A personal account skips the team step entirely.",
      node: <ConditionalOnboardingBlock />,
    },
    {
      icon: Loader2,
      label: "Async + retry",
      body: "The transition awaits real work, exposes isPending, fails the first try, and recovers on retry.",
      node: <AsyncProvisioningBlock />,
    },
  ];

  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow center>More than a stepper</Eyebrow>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Real flow logic, not just step tracking
        </h2>
        <p className="mt-4 text-muted-foreground">
          Most stepper libraries stop at "which step is active." Stepperize
          handles the hard parts too — guards that block navigation, computed
          branching, and async transitions with retry. These blocks are live:
          click through them.
        </p>
      </div>

      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {proofs.map((p) => (
          <div
            key={p.label}
            className="flex flex-col rounded-2xl border bg-card/60 p-5 backdrop-blur-sm transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border bg-background text-primary">
                <p.icon className="size-4" aria-hidden />
              </span>
              <h3 className="font-heading text-sm font-semibold">{p.label}</h3>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
            <div className="mt-5 flex flex-1 items-start justify-center">
              {p.node}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 text-center">
        <Link
          to="/blocks"
          search={{ category: "flow-control" }}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          See all flow-logic blocks
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </Section>
  );
}

/* ───────────────────────────── API showcase ─────────────────────────── */

function ApiShowcase({ links }: { links: Links }) {
  return (
    <Section className="border-y bg-muted/20">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div>
          <Eyebrow>A tiny, obvious API</Eyebrow>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Define once. Drive anything.
          </h2>
          <p className="mt-4 text-muted-foreground">
            One typed definition powers a hook, a provider, and accessible
            primitives. Step ids flow through <Code>render</Code>,{" "}
            <Code>goTo</Code>, and every component — so a typo is a compile
            error, not a runtime surprise.
          </p>
          <ul className="mt-6 space-y-3 text-sm">
            <FeatureLine>
              <Code>defineStepper</Code> — your steps, fully inferred
            </FeatureLine>
            <FeatureLine>
              <Code>stepper.match(&#123;…&#125;)</Code> — exhaustive,
              type-checked rendering
            </FeatureLine>
            <FeatureLine>
              <Code>stepper.next()</Code> / <Code>prev()</Code> — flat,
              ergonomic navigation
            </FeatureLine>
          </ul>
          <DocLink
            to={links.instance}
            className="mt-7 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            Explore the instance, live
            <ArrowRight className="size-4" aria-hidden />
          </DocLink>
        </div>
        <CodePreview />
      </div>
    </Section>
  );
}

/* ──────────────────────────── Mental model ──────────────────────────── */

function MentalModel() {
  const layers = [
    {
      icon: Component,
      title: "Your UI owns presentation",
      body: "Render anything — your markup, your design system, or the bundled primitives.",
      tone: "text-blue-500",
    },
    {
      icon: Workflow,
      title: "Stepperize owns the flow",
      body: "Active step, navigation, guards, drafts, and completion — one flat instance.",
      tone: "text-primary",
    },
    {
      icon: FileText,
      title: "Your data owns its state",
      body: "Keep field state, validation, and domain logic wherever it already lives.",
      tone: "text-emerald-500",
    },
  ];

  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow center>One small mental model</Eyebrow>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Stepperize owns the flow. You own everything else.
        </h2>
        <p className="mt-4 text-muted-foreground">
          It does one thing well — manage the flow — and stays out of the way of
          your UI and your data.
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {layers.map((l, i) => (
          <div
            key={l.title}
            className="relative rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="flex size-11 items-center justify-center rounded-xl border bg-background">
              <l.icon className={cn("size-5", l.tone)} aria-hidden />
            </div>
            <h3 className="mt-4 font-heading text-lg font-semibold">
              {l.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{l.body}</p>
            {i < layers.length - 1 && (
              <span
                className="absolute -right-6 top-1/2 hidden size-4 -translate-y-1/2 items-center justify-center rounded-full bg-muted/20 text-muted-foreground/45 md:flex"
                aria-hidden
              >
                <ArrowRight className="size-4" />
              </span>
            )}
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ─────────────────────────────── Features ───────────────────────────── */

function Features() {
  const features = [
    {
      icon: Workflow,
      title: "Flow logic built in",
      body: "Guards, branching, async transitions, completion state, and schema validation — from one stepper instance.",
      featured: true,
    },
    {
      icon: ShieldCheck,
      title: "Type-safe end to end",
      body: "Step ids become a literal union. Navigation, rendering, and values are all checked at compile time.",
    },
    {
      icon: Layers,
      title: "Headless by default",
      body: "Zero styles, zero markup opinions. Compose it into any UI or design system you already use.",
    },
    {
      icon: Combine,
      title: "Form-library agnostic",
      body: "Pairs cleanly with React Hook Form, TanStack Form, Conform, Zod — or nothing at all.",
    },
    {
      icon: Component,
      title: "Accessible primitives",
      body: "Stepper.* components ship roles, ARIA, and keyboard nav — ready for your styles.",
    },
    {
      icon: Blocks,
      title: "SSR & RSC ready",
      body: "Works in the App Router and on the server. No window access, no hydration surprises.",
    },
  ];

  return (
    <Section className="border-t bg-muted/20">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow center>Everything you'd expect</Eyebrow>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Built for production, not demos
        </h2>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => (
          <div
            key={f.title}
            className={cn(
              "group rounded-2xl border bg-card p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg",
              f.featured && "border-primary/30 ring-1 ring-primary/10",
            )}
          >
            <div
              className={cn(
                "flex size-11 items-center justify-center rounded-xl border bg-background text-primary transition-colors group-hover:border-primary/40 group-hover:bg-primary/5",
                f.featured && "border-primary/40 bg-primary/5",
              )}
            >
              <f.icon className="size-5" aria-hidden />
            </div>
            <h3 className="mt-4 font-heading text-base font-semibold">
              {f.title}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ──────────────────── Own your UI (ownership + blocks) ───────────────── */

const USE_CASES = [
  { icon: FileText, label: "Multi-step forms" },
  { icon: UserPlus, label: "Onboarding" },
  { icon: Combine, label: "Checkout" },
  { icon: Wand2, label: "Setup wizards" },
  { icon: Layers, label: "Surveys" },
  { icon: Sparkles, label: "AI workflows" },
  { icon: ShieldCheck, label: "Approval chains" },
  { icon: GitBranch, label: "Decision trees" },
];

function OwnYourUi({ links }: { links: Links }) {
  const showcase = [
    { label: "Approval timeline", node: <ApprovalTimelineBlock /> },
    { label: "AI workflow", node: <AiWorkflowBlock /> },
    { label: "Approval flow", node: <ApprovalFlowBlock /> },
  ];

  return (
    <Section>
      <div className="lp-rise mx-auto max-w-2xl text-center">
        <Eyebrow center>Own your UI</Eyebrow>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          No lock-in. It's your code.
        </h2>
        <p className="mt-4 text-muted-foreground">
          Stepperize is headless — it ships logic, never markup. Start from 31
          copy-paste blocks built with primitives and Tailwind, paste them into
          your project, and own every line. No theme to fight, nothing to eject.
        </p>
        <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/blocks"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Browse all blocks
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <DocLink
            to={links.primitives}
            className="inline-flex items-center gap-2 rounded-lg border bg-background px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Paintbrush className="size-4" aria-hidden />
            See the primitives
          </DocLink>
        </div>
      </div>

      {/* compact use-case strip — one row, not a full grid section */}
      <div
        className="lp-rise mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5"
        style={{ animationDelay: "80ms" }}
      >
        {USE_CASES.map((c) => (
          <span
            key={c.label}
            className="inline-flex items-center gap-1.5 rounded-full border bg-card/60 px-3 py-1.5 text-xs font-medium text-muted-foreground"
          >
            <c.icon className="size-3.5 text-primary" aria-hidden />
            {c.label}
          </span>
        ))}
      </div>

      <div
        className="lp-rise relative mt-14"
        style={{ animationDelay: "160ms" }}
      >
        <div
          aria-hidden
          className="lp-glow pointer-events-none absolute inset-x-10 top-1/2 -z-10 h-64 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="lp-float grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {showcase.map((item) => (
            <div
              key={item.label}
              className="group relative flex min-h-76 items-center justify-center overflow-hidden rounded-2xl border bg-card/60 p-6 shadow-sm backdrop-blur-sm transition-colors hover:border-primary/40 bg-[radial-gradient(var(--color-border)_1px,transparent_1px)] bg-size-[16px_16px]"
            >
              <span className="absolute left-3 top-3 z-10 rounded-full border bg-background/80 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
                {item.label}
              </span>
              <div className="w-full max-w-[20rem]">{item.node}</div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────────── Final CTA ──────────────────────────── */

function FinalCta({ links }: { links: Links }) {
  return (
    <Section>
      <div className="relative overflow-hidden rounded-3xl border bg-card px-6 py-16 text-center sm:px-12">
        <div
          aria-hidden
          className="lp-glow pointer-events-none absolute -top-24 left-1/2 h-72 w-160 -translate-x-1/2 rounded-full bg-primary/20 blur-[100px]"
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold tracking-tight sm:text-4xl">
            Ship your first flow in minutes.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Install the package, define your steps, and render. The flat, typed
            API gets out of your way.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <DocLink
              to={links.getStarted}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Get started
              <ArrowRight className="size-4" aria-hidden />
            </DocLink>
            <a
              href={links.github}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 rounded-lg border bg-background px-6 py-3 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <GitHubMark className="size-4" />
              Star on GitHub
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}

/* ─────────────────────────── shared bits ────────────────────────────── */

function FeatureLine({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Check className="size-3" aria-hidden />
      </span>
      <span className="text-muted-foreground">{children}</span>
    </li>
  );
}

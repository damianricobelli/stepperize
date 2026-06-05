import { ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { C, CodeFrame, Eyebrow, F, K, P, S, Section, T } from "./shared";

/**
 * Type-safety, shown not told. Each panel is a real compile error you'd hit in
 * an editor: a mistyped step id and a non-exhaustive match. The red squiggle +
 * `ts(...)` diagnostic make "type-safe" concrete in a glance, the way TanStack
 * and tRPC demonstrate inference rather than claiming it.
 */
export function TypeSafetyProof() {
  return (
    <Section>
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow center>Type-safe, proven</Eyebrow>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Your step ids are a type
        </h2>
        <p className="mt-4 text-muted-foreground">
          Step ids become a literal union the moment you call{" "}
          <span className="font-mono text-foreground">defineStepper</span>.
          Navigation, rendering, and per-step data are checked against it — so
          these mistakes fail in your editor, not in production.
        </p>
      </div>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Panel
          title="A mistyped id won't compile"
          diagnostic={
            <>
              Argument of type <Lit>"paymnt"</Lit> is not assignable to
              parameter of type <Lit>"shipping" | "payment" | "review"</Lit>.
            </>
          }
          code={2345}
        >
          <K>const</K> stepper <P>=</P> checkout<P>.</P>
          <F>useStepper</F>
          <P>();</P>
          {"\n\n"}
          stepper<P>.</P>
          <F>goTo</F>
          <P>(</P>
          <Squiggle>
            <S>"paymnt"</S>
          </Squiggle>
          <P>);</P>
          {"\n"}
          <C>{'//      ^ did you mean "payment"?'}</C>
        </Panel>

        <Panel
          title="match() must be exhaustive"
          diagnostic={
            <>
              Property <Lit>review</Lit> is missing in type{" "}
              <Lit>{"{ shipping; payment; }"}</Lit> but required in the matcher.
            </>
          }
          code={2741}
        >
          <K>return</K> stepper<P>.</P>
          <F>match</F>
          <Squiggle>
            <P>({"{"}</P>
          </Squiggle>
          {"\n"}
          {"  "}shipping<P>:</P> <P>{"() =>"}</P> <P>{"<"}</P>
          <T>Shipping</T> <P>{"/>,"}</P>
          {"\n"}
          {"  "}payment<P>:</P> {""}
          <P>{"() =>"}</P> <P>{"<"}</P>
          <T>Payment</T> <P>{"/>,"}</P>
          {"\n"}
          {"  "}
          <C>{"// review is required — forgot it?"}</C>
          {"\n"}
          <P>{"});"}</P>
        </Panel>
      </div>

      <p className="mx-auto mt-8 flex max-w-md items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" aria-hidden />
        No generics to wire up. Inference flows from your step array.
      </p>
    </Section>
  );
}

/** Red wavy underline like an editor squiggle. */
function Squiggle({ children }: { children: ReactNode }) {
  return (
    <span className="underline decoration-red-500 decoration-wavy decoration-1 underline-offset-4">
      {children}
    </span>
  );
}

/** Monospace literal inside a diagnostic message. */
function Lit({ children }: { children: ReactNode }) {
  return <span className="font-mono text-foreground/90">{children}</span>;
}

function Panel({
  title,
  diagnostic,
  code,
  children,
}: {
  title: string;
  diagnostic: ReactNode;
  code: number;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-semibold">{title}</h3>
      <CodeFrame filename="stepper.ts">
        <pre className="overflow-x-auto p-5 font-mono text-[13px] leading-relaxed">
          <code>{children}</code>
        </pre>
        {/* Editor-style diagnostic strip */}
        <div className="flex items-start gap-2 border-t border-red-500/20 bg-red-500/5 px-5 py-3 text-xs">
          <span
            className="mt-px flex size-4 shrink-0 items-center justify-center rounded-full bg-red-500/15 font-bold text-red-600 dark:text-red-400"
            aria-hidden
          >
            ✕
          </span>
          <p className="leading-relaxed text-muted-foreground">
            {diagnostic}{" "}
            <span className="text-red-600/80 dark:text-red-400/80">
              ts({code})
            </span>
          </p>
        </div>
      </CodeFrame>
    </div>
  );
}

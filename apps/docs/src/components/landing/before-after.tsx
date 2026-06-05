import { Check, X } from "lucide-react";
import type { ReactNode } from "react";
import { C, CodeFrame, Eyebrow, F, K, P, S, Section, T } from "./shared";

/**
 * The "why this library exists" section: the manual way every team writes the
 * first time (index state, stringly-typed switch, hand-rolled clamping) next to
 * the Stepperize version. Optimized for a 5-second skim — the red column is the
 * pain a visitor already recognizes, the green column is the relief.
 */
export function BeforeAfter() {
  return (
    <Section className="border-y bg-muted/20">
      <div className="mx-auto max-w-2xl text-center">
        <Eyebrow center>Why Stepperize</Eyebrow>
        <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight sm:text-4xl">
          Stop hand-rolling step state
        </h2>
        <p className="mt-4 text-muted-foreground">
          Every multi-step flow starts with an index, a switch, and clamping
          logic — then quietly rots as steps and rules pile up. Stepperize
          replaces all of it with one typed instance.
        </p>
      </div>

      <div className="mt-12 grid items-start gap-6 lg:grid-cols-2">
        <Column
          tone="bad"
          filename="checkout.tsx"
          badge="Without Stepperize"
          points={[
            "Manual index + clamping on every move",
            "Stringly-typed switch — a typo still compiles",
            "Miss a case and nothing warns you",
            "Validation gating wired by hand, per step",
          ]}
        >
          <BeforeCode />
        </Column>
        <Column
          tone="good"
          filename="checkout.tsx"
          badge="With Stepperize"
          points={[
            "next() / prev() clamp and guard for you",
            "Step ids are a typed union — typos fail to compile",
            "match() is exhaustive — miss a case, get an error",
            "Schema validation blocks the transition",
          ]}
        >
          <AfterCode />
        </Column>
      </div>
    </Section>
  );
}

function Column({
  tone,
  filename,
  badge,
  points,
  children,
}: {
  tone: "bad" | "good";
  filename: string;
  badge: string;
  points: string[];
  children: ReactNode;
}) {
  const Icon = tone === "bad" ? X : Check;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          className={
            tone === "bad"
              ? "inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:text-red-400"
              : "inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400"
          }
        >
          <Icon className="size-3.5" aria-hidden />
          {badge}
        </span>
      </div>
      <CodeFrame filename={filename} tone={tone}>
        <pre className="overflow-x-auto p-5 font-mono text-[12.5px] leading-relaxed">
          <code>{children}</code>
        </pre>
      </CodeFrame>
      <ul className="space-y-2 text-sm">
        {points.map((point) => (
          <li key={point} className="flex items-start gap-2.5">
            <span
              className={
                tone === "bad"
                  ? "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-red-500/10 text-red-600 dark:text-red-400"
                  : "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }
            >
              <Icon className="size-2.5" aria-hidden />
            </span>
            <span className="text-muted-foreground">{point}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BeforeCode() {
  return (
    <>
      <K>const</K> steps <P>=</P> <P>[</P>
      <S>"shipping"</S>
      <P>,</P> <S>"payment"</S>
      <P>,</P> <S>"review"</S>
      <P>];</P>
      {"\n"}
      <K>const</K> <P>[</P>step<P>,</P> setStep<P>] =</P> <F>useState</F>
      <P>(</P>
      <T>0</T>
      <P>);</P>
      {"\n\n"}
      <C>{"// clamp by hand, every time"}</C>
      {"\n"}
      <K>const</K> next <P>{"= () =>"}</P> <F>setStep</F>
      <P>((</P>s<P>{") =>"}</P>
      {"\n"}
      {"  "}
      <F>Math</F>
      <P>.</P>
      <F>min</F>
      <P>(</P>s <P>+</P> <T>1</T>
      <P>,</P> steps<P>.</P>length <P>-</P> <T>1</T>
      <P>));</P>
      {"\n\n"}
      <C>{"// stringly-typed — typo still compiles"}</C>
      {"\n"}
      <K>switch</K> <P>(</P>steps<P>[</P>step<P>]) {"{"}</P>
      {"\n"}
      {"  "}
      <K>case</K> <S>"shiping"</S>
      <P>:</P> <K>return</K> <P>{"<"}</P>
      <T>Shipping</T> <P>{"/>;"}</P>
      {"  "}
      <C>{"// 💥"}</C>
      {"\n"}
      {"  "}
      <K>case</K> <S>"payment"</S>
      <P>:</P> {""}
      <K>return</K> <P>{"<"}</P>
      <T>Payment</T> <P>{"/>;"}</P>
      {"\n"}
      {"  "}
      <C>{"// forgot review? no warning."}</C>
      {"\n"}
      <P>{"}"}</P>
    </>
  );
}

function AfterCode() {
  return (
    <>
      <K>const</K> checkout <P>=</P> <F>defineStepper</F>
      <P>([</P>
      {"\n"}
      {"  "}
      <P>{"{ "}</P>id<P>:</P> <S>"shipping"</S>
      <P>,</P> schema<P>:</P> <T>shippingSchema</T> <P>{"},"}</P>
      {"\n"}
      {"  "}
      <P>{"{ "}</P>id<P>:</P> <S>"payment"</S>
      <P>,</P> {""}schema<P>:</P> <T>paymentSchema</T> <P>{"},"}</P>
      {"\n"}
      {"  "}
      <P>{"{ "}</P>id<P>:</P> <S>"review"</S> <P>{"},"}</P>
      {"\n"}
      <P>]);</P>
      {"\n\n"}
      <K>const</K> stepper <P>=</P> checkout<P>.</P>
      <F>useStepper</F>
      <P>();</P>
      {"\n\n"}
      <C>{"// clamps + runs guards for you"}</C>
      {"\n"}
      stepper<P>.</P>
      <F>next</F>
      <P>();</P>
      {"\n\n"}
      <C>{"// exhaustive — a typo is a compile error"}</C>
      {"\n"}
      <K>return</K> stepper<P>.</P>
      <F>match</F>
      <P>({"{"}</P>
      {"\n"}
      {"  "}shipping<P>:</P> <P>{"() =>"}</P> <P>{"<"}</P>
      <T>Shipping</T> <P>{"/>,"}</P>
      {"\n"}
      {"  "}payment<P>:</P> {""}
      <P>{"() =>"}</P> <P>{"<"}</P>
      <T>Payment</T> <P>{"/>,"}</P>
      {"\n"}
      {"  "}review<P>:</P> {""}
      <P>{"() =>"}</P> <P>{"<"}</P>
      <T>Review</T> <P>{"/>,"}</P>
      {"\n"}
      <P>{"});"}</P>
    </>
  );
}

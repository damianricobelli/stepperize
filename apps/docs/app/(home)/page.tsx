import { Code } from "@/components/highlighter-code";
import { CodeExample } from "@/components/home/code-example";
import { Cta } from "@/components/home/cta";
import { DemoSection } from "@/components/home/demo-section";
import Features from "@/components/home/features";
import { Footer } from "@/components/home/footer";
import Hero from "@/components/home/hero";

export default function HomePage() {
	return (
		<div className="min-h-screen">
			<Hero />
			<Features />
			<CodeExample>
				<Code
					code={`import * as React from "react";
import { defineStepper } from "@stepperize/react";

const stepper = defineStepper(
  { id: "step-1", title: "Step 1" },
  { id: "step-2", title: "Step 2", description: "Second step" }
);

const StepperDemo = () => {
  const methods = stepper.useStepper();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <button onClick={() => methods.next()}>Next</button>
        <button onClick={() => methods.prev()}>Prev</button>
      </div>
      {methods.switch({
        "step-1": (step) => <span>First: {step.title}</span>,
        "step-2": (step) => (
          <div className="flex flex-col gap-4">
            <span>Second: {step.title}</span>
            <p>{step.description}</p>
          </div>
        )
      })}
    </div>
  );
}
`}
					lang="tsx"
				/>
			</CodeExample>
			<DemoSection />
			<Cta />
			<Footer />
		</div>
	);
}

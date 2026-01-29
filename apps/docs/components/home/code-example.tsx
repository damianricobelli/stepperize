"use client";

import { cn } from "@/lib/cn";

export const CodeExample = ({ className, children }: { className?: string; children: React.ReactNode }) => {
	return (
		<section id="examples" className={cn("px-4 sm:px-6 lg:px-8 py-20 bg-gray-2/50", className)}>
			<div className="max-w-3xl mx-auto">
				<h2 className="text-2xl font-semibold text-gray-12 mb-2 text-center">Simple to implement</h2>
				<p className="text-gray-11 text-center mb-8">Get started with a few lines.</p>
				<div className="rounded-xl border border-gray-6 overflow-hidden">{children}</div>
				<p className="text-sm text-gray-11 mt-6 text-center">
					The <code className="px-1.5 py-0.5 rounded bg-gray-4 text-indigo-11 text-xs font-medium">useStepper</code> hook
					manages the flow.{" "}
					<a href="/docs/react" className="text-indigo-11 hover:underline">
						Full docs →
					</a>
				</p>
			</div>
		</section>
	);
};

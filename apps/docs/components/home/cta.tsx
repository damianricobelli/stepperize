"use client";

import { cn } from "@/lib/cn";
import { ExternalLink, Github } from "lucide-react";

export const Cta = ({ className }: { className?: string }) => {
	return (
		<section className={cn("px-4 sm:px-6 lg:px-8 py-20 border-t border-gray-6", className)}>
			<div className="max-w-2xl mx-auto text-center">
				<h2 className="text-xl font-semibold text-gray-12 mb-2">Ready to build?</h2>
				<p className="text-gray-11 mb-8">Start with Stepperize today.</p>
				<div className="flex flex-wrap gap-3 justify-center">
					<a
						href="https://github.com/damianricobelli/stepperize"
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg text-white bg-gray-12 hover:bg-gray-11 dark:bg-gray-4 dark:text-gray-12 dark:hover:bg-gray-5 transition-colors"
					>
						<Github className="size-4" />
						GitHub
					</a>
					<a
						href="https://www.npmjs.com/package/@stepperize/react"
						target="_blank"
						rel="noreferrer"
						className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-gray-7 text-gray-12 hover:bg-gray-3 transition-colors"
					>
						<ExternalLink className="size-4" />
						NPM
					</a>
				</div>
			</div>
		</section>
	);
};

"use client";

import { ChevronRight } from "lucide-react";

const Hero = () => {
	return (
		<section className="min-h-[85vh] flex items-center px-4 sm:px-6 lg:px-8">
			<div className="max-w-3xl mx-auto text-center">
				<a
					href="/docs/react/migration/migrating-to-v6"
					className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-indigo-3 text-indigo-11 border border-indigo-6 mb-8 hover:bg-indigo-4 transition-colors"
				>
					<span className="size-2 rounded-full bg-indigo-9 animate-pulse" />
					Stepperize v6 is here
				</a>

				<h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-gray-12 mb-6">
					Multi-step flows{" "}
					<span className="text-indigo-11">made simple</span>
				</h1>

				<p className="text-lg text-gray-11 mb-10 max-w-xl mx-auto">
					Lightweight, type-safe library for step-by-step experiences. Minimal boilerplate, full control.
				</p>

				<div className="flex flex-col sm:flex-row gap-3 justify-center">
					<a
						href="/docs/react"
						className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg text-white bg-indigo-9 hover:bg-indigo-10 transition-colors"
					>
						Get Started
						<ChevronRight className="size-4" />
					</a>
					<a
						href="#demo"
						className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg border border-gray-7 text-gray-12 hover:bg-gray-3 transition-colors"
					>
						View Demo
					</a>
				</div>
			</div>
		</section>
	);
};

export default Hero;

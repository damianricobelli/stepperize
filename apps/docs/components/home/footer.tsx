"use client";

import { Github } from "lucide-react";

export const Footer = () => {
	return (
		<footer className="border-t border-gray-6 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
				<div className="flex items-center gap-2">
					<span className="font-semibold text-gray-12">Stepperize</span>
				</div>
				<nav className="flex items-center gap-6 text-sm">
					<a href="/docs/react" className="text-gray-11 hover:text-gray-12 transition-colors">
						Docs
					</a>
					<a
						href="https://github.com/damianricobelli/stepperize"
						target="_blank"
						rel="noopener noreferrer"
						className="text-gray-11 hover:text-gray-12 transition-colors inline-flex items-center gap-1"
					>
						<Github className="size-4" />
						GitHub
					</a>
					<a
						href="https://www.npmjs.com/package/@stepperize/react"
						target="_blank"
						rel="noopener noreferrer"
						className="text-gray-11 hover:text-gray-12 transition-colors"
					>
						NPM
					</a>
				</nav>
			</div>
			<p className="max-w-4xl mx-auto mt-6 text-center text-gray-10 text-xs">
				© {new Date().getFullYear()} Stepperize
			</p>
		</footer>
	);
};

import { HeroStepper } from "@/components/hero";
import { HowItWorks } from "@/components/how-it-works";
import Link from "next/link";

export default function HomePage() {
	return (
		<main className="flex flex-col pt-24 lg:pt-32 gap-24 lg:gap-48 min-h-screen">
			<section className="container px-4 md:px-6">
				<div className="grid gap-12 lg:grid-cols-[1fr_400px] xl:grid-cols-[1fr_600px]">
					<div className="flex flex-col justify-center gap-y-4">
						<div className="space-y-4">
							<h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
								The library for building step-by-step workflows
							</h1>
							<p className="max-w-[600px] text-muted-foreground md:text-xl">
								Create and customize step flows for your web and mobile apps easily and 100% typesafe.
							</p>
						</div>
						<div className="flex flex-col gap-2 min-[400px]:flex-row">
							<Link
								className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
								href="docs/react"
							>
								Get Started
							</Link>
							<Link
								className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
								href="https://github.com/damianricobelli/stepperize"
							>
								GitHub
							</Link>
						</div>
					</div>
					<div className="flex items-center justify-center">
						<div className="w-full space-y-4">
							<HeroStepper />
						</div>
					</div>
				</div>
			</section>
			<HowItWorks />
			<section className="container px-4 md:px-6">
				<div className="text-center space-y-4">
					<h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">Ready to simplify your flows?</h2>
					<p className="max-w-[600px] mx-auto text-muted-foreground md:text-lg">
						Start building intuitive, step-by-step workflows for your applications today. Stepperize makes it easy and
						type-safe.
					</p>
					<div className="flex flex-col gap-2 min-[400px]:flex-row justify-center mt-6">
						<Link
							className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
							href="docs/react"
						>
							Get Started
						</Link>
						<Link
							className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
							href="https://github.com/damianricobelli/stepperize"
						>
							GitHub
						</Link>
					</div>
				</div>
			</section>
			<footer className="mt-auto py-6 bg-gray-100 dark:bg-transparent border-t border-gray-200 dark:border-gray-800">
				<div className="container px-4 md:px-6">
					<p className="text-sm text-gray-600 dark:text-gray-100 text-center">
						© {new Date().getFullYear()} Stepperize. All rights reserved.
					</p>
				</div>
			</footer>
		</main>
	);
}

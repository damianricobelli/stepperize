import { StepperExamples } from "@/components/examples";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { GitPullRequestArrow, Star } from "lucide-react";
import Link from "next/link";
import Balancer from "react-wrap-balancer";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center py-24 px-5 gap-8 max-w-3xl mx-auto">
			<div className="flex flex-col gap-2 items-center">
				<h1 className="font-bold text-4xl">Shadcn Stepper</h1>
				<h2 className="font-medium text-xl text-muted-foreground text-center">
					<Balancer>A complete stepper component built with Shadcn UI</Balancer>
				</h2>
			</div>
			<div className="flex flex-col gap-2 items-center">
				<div className="flex gap-4 items-center">
					<Button asChild variant="outline">
						<Link
							href="https://github.com/shadcn-ui/ui/pull/318"
							target="_blank"
						>
							<GitPullRequestArrow className="mr-2 size-4" />
							PR for Shadcn UI
						</Link>
					</Button>
					<Button asChild>
						<Link href="https://github.com/damianricobelli" target="_blank">
							<Star className="mr-2 size-4" />
							GitHub
						</Link>
					</Button>
					<ThemeSwitcher />
				</div>
				<Button
					asChild
					variant="link"
					className="underline text-muted-foreground"
				>
					<Link href="https://github.com/shadcn-ui/ui/blob/d659b213199c1e2204b0f79749827f0f73df448c/apps/www/content/docs/components/stepper.mdx">
						Documentation
					</Link>
				</Button>
			</div>
			<StepperExamples />
		</main>
	);
}

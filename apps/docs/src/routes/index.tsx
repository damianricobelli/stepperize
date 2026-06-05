import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/landing-page";
import {
	homeKeywords,
	homeMeta,
	jsonLdScript,
	seo,
	softwareApplicationLd,
	webSiteLd,
} from "@/lib/seo";

export const Route = createFileRoute("/")({
	component: Home,
	head: () => {
		const meta = homeMeta();
		return {
			...seo({
				fullTitle: meta.title,
				description: meta.description,
				socialTitle: meta.socialTitle,
				socialDescription: meta.socialDescription,
				keywords: homeKeywords(),
				canonical: "/",
				type: "website",
			}),
			scripts: [
				jsonLdScript(softwareApplicationLd()),
				jsonLdScript(webSiteLd()),
			],
		};
	},
});

function Home() {
	return <LandingPage />;
}

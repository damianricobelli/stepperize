import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Scripts,
	useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { VersionBanner } from "@/components/site/version-banner";
import { getDocsVersion } from "@/lib/docs-tree";
import { seo } from "@/lib/seo";

import appCss from "../styles.css?url";

const defaultSeo = seo();

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{
				charSet: "utf-8",
			},
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1",
			},
			{ name: "theme-color", content: "#000000" },
			{ name: "robots", content: "index, follow" },
			{
				name: "googlebot",
				content: "index, follow, max-image-preview:large",
			},
			{ name: "generator", content: "Stepperize Docs" },
			// Site-wide defaults; leaf routes override title/description/og/canonical.
			...defaultSeo.meta,
		],
		links: [
			{
				rel: "stylesheet",
				href: appCss,
			},
			{ rel: "manifest", href: "/manifest.json" },
			{ rel: "icon", href: "/favicon.ico", sizes: "any" },
			{ rel: "apple-touch-icon", href: "/logo192.png" },
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	const pathname = useLocation({ select: (location) => location.pathname });
	const version = getDocsVersion(pathname.split("/").filter(Boolean).slice(1));
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="flex min-h-screen flex-col">
				<RootProvider search={{ options: { defaultTag: version } }}>
					{(pathname === "/" || pathname.startsWith("/docs/")) && (
						<VersionBanner />
					)}
					{children}
				</RootProvider>
				<TanStackDevtools
					config={{
						position: "bottom-right",
					}}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}

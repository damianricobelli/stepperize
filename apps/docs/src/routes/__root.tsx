import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Scripts,
	useLocation,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { THEME_COLORS, ThemeColorSync } from "@/components/site/theme-color";
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
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{ name: "color-scheme", content: "light dark" },
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
			{ rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
			{ rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
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
				{/*
				 * Rendered here rather than in head(): HeadContent dedupes meta tags by
				 * name, which would keep only one of the two schemes. ThemeColorSync
				 * retargets both when the theme is picked with the toggle.
				 */}
				<meta
					name="theme-color"
					media="(prefers-color-scheme: light)"
					content={THEME_COLORS.light}
				/>
				<meta
					name="theme-color"
					media="(prefers-color-scheme: dark)"
					content={THEME_COLORS.dark}
				/>
			</head>
			<body className="flex min-h-screen flex-col">
				<RootProvider search={{ options: { defaultTag: version } }}>
					<ThemeColorSync />
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

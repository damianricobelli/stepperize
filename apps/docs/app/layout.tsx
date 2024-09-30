import { baseUrl, createMetadata } from "@/utils/metadata";
import "./global.css";
import { RootProvider } from "fumadocs-ui/provider";
import { Inter } from "next/font/google";
import type { ReactNode } from "react";

export const metadata = createMetadata({
	title: {
		template: "%s | Stepperize",
		default: "Stepperize",
	},
	description: "The library for building step-by-step workflows.",
	metadataBase: baseUrl,
});

const inter = Inter({
	subsets: ["latin"],
});

export default function Layout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" className={inter.className} suppressHydrationWarning>
			<body>
				<RootProvider>{children}</RootProvider>
			</body>
		</html>
	);
}

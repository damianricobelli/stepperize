import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { ThemeProvider } from "next-themes";
import { Inter as FontSans } from "next/font/google";
import "./globals.css";

const fontSans = FontSans({
	subsets: ["latin"],
	variable: "--font-sans",
});
export const metadata: Metadata = {
	title: "Shadcn Stepper",
	description: "Display content divided into a steps sequence",
	openGraph: {
		title: "Shadcn Stepper",
		description: "Display content divided into a steps sequence",
		url: "https://shadcn-stepper.vercel.app/",
	},
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head />
			<body
				className={cn(
					"min-h-screen bg-background font-sans antialiased",
					fontSans.variable,
				)}
			>
				<ThemeProvider attribute="class" enableSystem disableTransitionOnChange>
					<Toaster />
					{children}
				</ThemeProvider>
			</body>
		</html>
	);
}

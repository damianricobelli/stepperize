import "./global.css";
import { baseUrl, createMetadata } from "@/lib/metadata";
import { RootProvider } from "fumadocs-ui/provider";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { ReactNode } from "react";

export const metadata = createMetadata({
  title: {
    template: "%s | Stepperize",
    default: "Stepperize",
  },
  description: "The type-safe library for building step-by-step workflows",
  metadataBase: baseUrl,
});

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}

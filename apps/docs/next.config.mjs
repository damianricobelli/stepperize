import { createMDX } from "fumadocs-mdx/next";

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
	reactStrictMode: true,
	serverExternalPackages: ["twoslash", "typescript"],
	experimental: {
		turbopackScopeHoisting: false,
	},
};

export default withMDX(config);
